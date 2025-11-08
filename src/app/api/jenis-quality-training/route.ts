import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry, withAuditUser } from '@/lib/prisma'

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const prisma = createPrismaClient()
    const items = await withRetry(() => prisma.jenisQualityTraining.findMany({
      include: { qualityTraining: true, detailQualityTrainings: true },
      orderBy: { createdAt: 'desc' }
    }))
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching JenisQualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, logos = [], qualityTrainingId, details = [], updatedBy, updateNotes } = body
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!qualityTrainingId) return NextResponse.json({ error: 'QualityTraining is required' }, { status: 400 })
    const prisma = createPrismaClient()
    const created = await withAuditUser(prisma, user.id, async () => {
      return await withRetry(() => prisma.jenisQualityTraining.create({
        data: {
          name,
          description,
          logos,
          qualityTrainingId,
          updatedBy,
          updateNotes,
          detailQualityTrainings: {
            create: (details as DetailInput[]).map((d: DetailInput) => ({
              name: d.name,
              description: d.description,
              linkslide: d.linkslide,
              updatedBy: d.updatedBy,
              updateNotes: d.updateNotes,
              logos: d.logos || [],
              subdetailQualityTrainings: {
                create: (d.subdetails || []).map((s: SubdetailInput) => ({
                  name: s.name,
                  description: s.description,
                  updatedBy: s.updatedBy,
                  updateNotes: s.updateNotes,
                  logos: s.logos || []
                }))
              }
            }))
          }
        },
        include: { qualityTraining: true, detailQualityTrainings: { include: { subdetailQualityTrainings: true } } }
      }))
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating JenisQualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


