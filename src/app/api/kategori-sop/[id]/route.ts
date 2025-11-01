import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const prisma = createPrismaClient()
    const kategoriSOP = await withRetry(() => prisma.kategoriSOP.findUnique({
      where: { id },
      include: {
        sops: {
          include: {
            jenisSOPs: true
          }
        }
      }
    }))

    if (!kategoriSOP) {
      return NextResponse.json({ error: 'Kategori SOP not found' }, { status: 404 })
    }

    return NextResponse.json(kategoriSOP)
  } catch (error) {
    console.error('Error fetching kategori SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const kategoriSOP = await withRetry(() => prisma.kategoriSOP.update({
      where: { id },
      data: {
        name,
        description
      },
      include: {
        sops: true
      }
    }))

    return NextResponse.json(kategoriSOP)
  } catch (error: any) {
    console.error('Error updating kategori SOP:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Kategori SOP dengan nama ini sudah ada' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const prisma = createPrismaClient()
    await withRetry(() => prisma.kategoriSOP.delete({
      where: { id }
    }))

    return NextResponse.json({ message: 'Kategori SOP deleted successfully' })
  } catch (error) {
    console.error('Error deleting kategori SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

