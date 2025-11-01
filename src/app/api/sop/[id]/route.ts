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
    const sop = await withRetry(() => prisma.sOP.findUnique({
      where: { id },
      include: {
        kategoriSOP: true,
        jenisSOPs: {
          include: {
            detailSOPs: true
          }
        }
      }
    }))

    if (!sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 })
    }

    return NextResponse.json(sop)
  } catch (error) {
    console.error('Error fetching SOP:', error)
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
    const { name, description, kategoriSOPId } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!kategoriSOPId) {
      return NextResponse.json({ error: 'Kategori SOP is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const sop = await withRetry(() => prisma.sOP.update({
      where: { id },
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

    return NextResponse.json(sop)
  } catch (error) {
    console.error('Error updating SOP:', error)
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
    await withRetry(() => prisma.sOP.delete({
      where: { id }
    }))

    return NextResponse.json({ message: 'SOP deleted successfully' })
  } catch (error) {
    console.error('Error deleting SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

