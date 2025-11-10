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

interface DetailInput {
  name: string
  value: string
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
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
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
    const jenisSOP = await withAuditUser(prisma, user.id, async (tx) => {
      return await tx.jenisSOP.create({
        data: {
          name,
          content,
          images,
          sopId,
          createdBy: user.email || 'system',
          detailSOPs: {
            create: (details as DetailInput[]).map((detail: DetailInput) => ({
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
      })
    })

    return NextResponse.json(jenisSOP, { status: 201 })
  } catch (error) {
    console.error('Error creating Jenis SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

