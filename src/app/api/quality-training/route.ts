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
    const items = await withRetry(() => prisma.qualityTraining.findMany({
      include: {
        jenisQualityTrainings: true
      },
      orderBy: { createdAt: 'desc' }
    }))
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching QualityTraining:', error)
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
    const { title, description, logos = [] } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const created = await withRetry(() => prisma.qualityTraining.create({
      data: {
        title,
        description,
        logos,
        createdBy: (session.user as any)?.email || 'system'
      },
      include: {
        jenisQualityTrainings: true
      }
    }))
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating QualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


