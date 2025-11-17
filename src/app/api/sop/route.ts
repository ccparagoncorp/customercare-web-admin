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
    const sops = await withRetry(() => prisma.sOP.findMany({
      include: {
        kategoriSOP: true,
        jenisSOPs: {
          include: {
            detailSOPs: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    return NextResponse.json(sops)
  } catch (error) {
    console.error('Error fetching SOP:', error)
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

    const { name, description, kategoriSOPId, link } = normalizeEmptyStrings(await request.json()) as {
      name?: string
      description?: string | null
      kategoriSOPId?: string
      link?: string | null
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!kategoriSOPId) {
      return NextResponse.json({ error: 'Kategori SOP is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const sop = await withAuditUser(prisma, user.id, async (tx) => {
      return await tx.sOP.create({
        data: {
          name,
          description,
          link,
          kategoriSOPId
        },
        include: {
          kategoriSOP: true,
          jenisSOPs: true
        }
      })
    })

    return NextResponse.json(sop, { status: 201 })
  } catch (error) {
    console.error('Error creating SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

