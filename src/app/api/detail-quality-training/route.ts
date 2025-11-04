import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const prisma = createPrismaClient()
    const items = await withRetry(() => prisma.detailQualityTraining.findMany({
      include: { jenisQualityTraining: true },
      orderBy: { createdAt: 'desc' }
    }))
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching DetailQualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { name, description, logos = [], jenisQualityTrainingId } = body
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!jenisQualityTrainingId) return NextResponse.json({ error: 'Jenis is required' }, { status: 400 })
    const prisma = createPrismaClient()
    const created = await withRetry(() => prisma.detailQualityTraining.create({
      data: { name, description, logos, jenisQualityTrainingId },
      include: { jenisQualityTraining: true }
    }))
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating DetailQualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


