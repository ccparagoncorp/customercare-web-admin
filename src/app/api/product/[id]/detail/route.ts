import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, value, images = [] } = body

    if (!name || !value) {
      return NextResponse.json({ error: 'Name and value are required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const detail = await withRetry(() => prisma.detailProduk.create({
      data: {
        name,
        value,
        images,
        produkId: id
      }
    }))

    return NextResponse.json(detail, { status: 201 })
  } catch (error) {
    console.error('Error creating product detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
