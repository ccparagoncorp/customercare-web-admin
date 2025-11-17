import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry, withAuditUser } from '@/lib/prisma'
import { normalizeEmptyStrings } from '@/lib/utils/normalize'

interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

interface Session {
  user: SessionUser
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const prisma = createPrismaClient()
    const item = await withRetry(() => prisma.qualityTraining.findUnique({
      where: { id },
      include: { jenisQualityTrainings: true }
    }))
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching QualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = normalizeEmptyStrings(await request.json()) as {
      title?: string
      description?: string | null
      logos?: string[]
      updatedBy?: string
      updateNotes?: string
    }
    const { title, description, logos = [], updatedBy, updateNotes } = body
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    const prisma = createPrismaClient()
    const updated = await withAuditUser(prisma, user.id, async (tx) => {
      return await tx.qualityTraining.update({
        where: { id },
        data: { title, description, logos, updatedBy, updateNotes }
      })
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating QualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const prisma = createPrismaClient()
    await withAuditUser(prisma, user.id, async (tx) => {
      return await tx.qualityTraining.delete({ where: { id } })
    })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Error deleting QualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


