import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prisma = createPrismaClient()
    const jenisSOPs = await withRetry(() => prisma.jenisSOP.findMany({
      include: {
        sop: {
          include: {
            kategoriSOP: true
          }
        },
        detailSOPs: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    return NextResponse.json(jenisSOPs)
  } catch (error) {
    console.error('Error fetching Jenis SOP:', error)
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
    const { name, content, images = [], sopId, details = [] } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!sopId) {
      return NextResponse.json({ error: 'SOP is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const jenisSOP = await withRetry(() => prisma.jenisSOP.create({
      data: {
        name,
        content,
        images,
        sopId,
        createdBy: (session.user as any)?.email || 'system',
        detailSOPs: {
          create: details.map((detail: any) => ({
            name: detail.name,
            value: detail.value
          }))
        }
      },
      include: {
        sop: {
          include: {
            kategoriSOP: true
          }
        },
        detailSOPs: true
      }
    }))

    return NextResponse.json(jenisSOP, { status: 201 })
  } catch (error) {
    console.error('Error creating Jenis SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

