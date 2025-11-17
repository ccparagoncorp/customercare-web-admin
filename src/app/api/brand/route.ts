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
    const brands = await withRetry(() => prisma.brand.findMany({
      include: {
        kategoriProduks: {
          include: {
            subkategoriProduks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    return NextResponse.json(brands)
  } catch (error) {
    console.error('Error fetching brands:', error)
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

    const body = normalizeEmptyStrings(await request.json()) as {
      name?: string
      description?: string | null
      images?: string[]
      link_sampul?: string | null
      colorbase?: string | null
    }
    const { name, description, images = [], link_sampul, colorbase = "#03438f" } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const brand = await withAuditUser(prisma, user.id, async (tx) => {
      return await tx.brand.create({
        data: {
          name,
          description,
          images,
          link_sampul,
          colorbase,
          createdBy: user.email || 'system'
        }
      })
    })

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    console.error('Error creating brand:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Brand name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
