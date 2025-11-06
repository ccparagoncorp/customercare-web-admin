import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'

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

interface SubdetailInput {
  name: string
  description: string
  updatedBy?: string
  updateNotes?: string
  logos?: string[]
}

interface DetailInput {
  name: string
  description: string
  linkslide?: string
  updatedBy?: string
  updateNotes?: string
  logos?: string[]
  subdetails?: SubdetailInput[]
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
    const item = await withRetry(() => prisma.jenisQualityTraining.findUnique({
      where: { id },
      include: {
        qualityTraining: true,
        detailQualityTrainings: {
          include: { subdetailQualityTrainings: true }
        }
      }
    }))
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching JenisQualityTraining:', error)
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
    const body = await request.json()
    const { name, description, logos = [], qualityTrainingId, details = [], updatedBy, updateNotes } = body
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!qualityTrainingId) return NextResponse.json({ error: 'QualityTraining is required' }, { status: 400 })
    const prisma = createPrismaClient()
    // Replace strategy: update main fields, purge details, recreate nested
    await withRetry(() => prisma.jenisQualityTraining.update({
      where: { id },
      data: { name, description, logos, qualityTrainingId, updatedBy, updateNotes }
    }))

    // Delete existing details (cascades subdetails)
    await withRetry(() => prisma.detailQualityTraining.deleteMany({ where: { jenisQualityTrainingId: id } }))

    // Recreate details + subdetails if provided
    if (details && details.length > 0) {
      for (const d of details as DetailInput[]) {
        const createdDetail = await withRetry(() => prisma.detailQualityTraining.create({
          data: {
            name: d.name,
            description: d.description,
            linkslide: d.linkslide,
            updatedBy: d.updatedBy,
            updateNotes: d.updateNotes,
            logos: d.logos || [],
            jenisQualityTrainingId: id
          }
        }))
        if (d.subdetails && d.subdetails.length > 0) {
          await withRetry(() => prisma.subdetailQualityTraining.createMany({
            data: d.subdetails.map((s: SubdetailInput) => ({
              name: s.name,
              description: s.description,
              updatedBy: s.updatedBy,
              updateNotes: s.updateNotes,
              logos: s.logos || [],
              detailQualityTrainingId: createdDetail.id
            }))
          }))
        }
      }
    }

    const refreshed = await withRetry(() => prisma.jenisQualityTraining.findUnique({
      where: { id },
      include: {
        qualityTraining: true,
        detailQualityTrainings: { include: { subdetailQualityTrainings: true } }
      }
    }))
    return NextResponse.json(refreshed)
  } catch (error) {
    console.error('Error updating JenisQualityTraining:', error)
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
    await withRetry(() => prisma.jenisQualityTraining.delete({ where: { id } }))
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Error deleting JenisQualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


