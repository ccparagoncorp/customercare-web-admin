import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
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

export async function POST(
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
    const { name, detail, images = [] } = body

    if (!name || !detail) {
      return NextResponse.json({ error: 'Name and detail are required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const detailProduk = await withRetry(() => prisma.detailProduk.create({
      data: {
        name,
        detail,
        images,
        produkId: id
      }
    }))

    return NextResponse.json(detailProduk, { status: 201 })
  } catch (error) {
    console.error('Error creating product detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
