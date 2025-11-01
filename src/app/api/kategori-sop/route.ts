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
    const kategoriSOPs = await withRetry(() => prisma.kategoriSOP.findMany({
      include: {
        sops: {
          include: {
            jenisSOPs: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    return NextResponse.json(kategoriSOPs)
  } catch (error) {
    console.error('Error fetching kategori SOP:', error)
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
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const kategoriSOP = await withRetry(() => prisma.kategoriSOP.create({
      data: {
        name,
        description
      },
      include: {
        sops: true
      }
    }))

    return NextResponse.json(kategoriSOP, { status: 201 })
  } catch (error: any) {
    console.error('Error creating kategori SOP:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Kategori SOP dengan nama ini sudah ada' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

