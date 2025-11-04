import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const prisma = createPrismaClient()
    const item = await withRetry(() => prisma.detailQualityTraining.findUnique({
      where: { id },
      include: { jenisQualityTraining: true }
    }))
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching DetailQualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const { name, description, logos = [], jenisQualityTrainingId } = body
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!jenisQualityTrainingId) return NextResponse.json({ error: 'Jenis is required' }, { status: 400 })
    const prisma = createPrismaClient()
    const updated = await withRetry(() => prisma.detailQualityTraining.update({
      where: { id },
      data: { name, description, logos, jenisQualityTrainingId }
    }))
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating DetailQualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const prisma = createPrismaClient()
    await withRetry(() => prisma.detailQualityTraining.delete({ where: { id } }))
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Error deleting DetailQualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


