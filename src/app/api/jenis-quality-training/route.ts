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
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { name, description, logos = [], qualityTrainingId, details = [], updatedBy, updateNotes } = body
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!qualityTrainingId) return NextResponse.json({ error: 'QualityTraining is required' }, { status: 400 })
    const prisma = createPrismaClient()
    const created = await withRetry(() => prisma.jenisQualityTraining.create({
      data: {
        name,
        description,
        logos,
        qualityTrainingId,
        updatedBy,
        updateNotes,
        detailQualityTrainings: {
          create: details.map((d: any) => ({
            name: d.name,
            description: d.description,
            linkslide: d.linkslide,
            updatedBy: d.updatedBy,
            updateNotes: d.updateNotes,
            logos: d.logos || [],
            subdetailQualityTrainings: {
              create: (d.subdetails || []).map((s: any) => ({
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
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating JenisQualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


