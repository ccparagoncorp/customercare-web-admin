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

    const body = await request.json()
    const { name, description, kategoriSOPId } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!kategoriSOPId) {
      return NextResponse.json({ error: 'Kategori SOP is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const sop = await withRetry(() => prisma.sOP.create({
      data: {
        name,
        description,
        kategoriSOPId
      },
      include: {
        kategoriSOP: true,
        jenisSOPs: true
      }
    }))

    return NextResponse.json(sop, { status: 201 })
  } catch (error) {
    console.error('Error creating SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

