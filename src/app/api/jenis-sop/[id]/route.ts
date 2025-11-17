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

interface DetailInput {
  name: string
  value: string
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
    const jenisSOP = await withRetry(() => prisma.jenisSOP.findUnique({
      where: { id },
      include: {
        sop: {
          include: {
            kategoriSOP: true
          }
        },
        detailSOPs: true
      }
    }))

    if (!jenisSOP) {
      return NextResponse.json({ error: 'Jenis SOP not found' }, { status: 404 })
    }

    return NextResponse.json(jenisSOP)
  } catch (error) {
    console.error('Error fetching Jenis SOP:', error)
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
      name?: string
      content?: string | null
      images?: string[]
      sopId?: string
      details?: DetailInput[]
      updatedBy?: string
      updateNotes?: string
      link?: string | null
    }
    const { name, content, images = [], sopId, details = [], updatedBy, updateNotes, link } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!sopId) {
      return NextResponse.json({ error: 'SOP is required' }, { status: 400 })
    }
    if (!updateNotes) {
      return NextResponse.json({ error: 'Update notes is required' }, { status: 400 })
    }
    if (!updatedBy) {
      return NextResponse.json({ error: 'Updated by is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    
    // Update Jenis SOP with audit tracking
    await withAuditUser(prisma, user.id, async (tx) => {
      // Update Jenis SOP
      await tx.jenisSOP.update({
        where: { id },
        data: {
          name,
          content,
          link,
          images,
          sopId,
          updatedBy,
          updateNotes
        }
      })

      // Update details
      if (details.length > 0) {
        // Delete existing details
        await tx.detailSOP.deleteMany({
          where: { jenisSOPId: id }
        })

        // Create new details
        await tx.detailSOP.createMany({
          data: (details as DetailInput[]).map((detail: DetailInput) => ({
            name: detail.name,
            value: detail.value,
            jenisSOPId: id
          }))
        })
      }
    })

    const updatedJenisSOP = await withRetry(() => prisma.jenisSOP.findUnique({
      where: { id },
      include: {
        sop: {
          include: {
            kategoriSOP: true
          }
        },
        detailSOPs: true
      }
    }))

    return NextResponse.json(updatedJenisSOP)
  } catch (error) {
    console.error('Error updating Jenis SOP:', error)
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
      return await tx.jenisSOP.delete({
        where: { id }
      })
    })

    return NextResponse.json({ message: 'Jenis SOP deleted successfully' })
  } catch (error) {
    console.error('Error deleting Jenis SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

