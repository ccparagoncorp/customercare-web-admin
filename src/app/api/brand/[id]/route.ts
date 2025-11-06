import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import { deleteProductFileServer } from '@/lib/supabase-storage'

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

export async function GET(
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

    const prisma = createPrismaClient()
    const brand = await withRetry(() => prisma.brand.findUnique({
      where: { id },
      include: {
        kategoriProduks: {
          include: {
            subkategoriProduks: true
          }
        }
      }
    }))

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Error fetching brand:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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
    const { name, description, images = [], link_sampul, colorbase, updateNotes } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const brand = await withRetry(() => prisma.brand.update({
      where: { id },
      data: {
        name,
        description,
        images,
        link_sampul,
        colorbase,
        updatedBy: user.email || 'system',
        updateNotes
      }
    }))

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Error updating brand:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Brand name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const prisma = createPrismaClient()
    
    // Check if brand has associated categories
    const brandWithCategories = await withRetry(() => prisma.brand.findUnique({
      where: { id },
      include: {
        kategoriProduks: true
      }
    }))

    if (brandWithCategories && brandWithCategories.kategoriProduks && brandWithCategories.kategoriProduks.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete brand with associated categories' 
      }, { status: 400 })
    }

    // Delete images from Supabase Storage
    if (brandWithCategories?.images && brandWithCategories.images.length > 0) {
      for (const imageUrl of brandWithCategories.images) {
        try {
          await deleteProductFileServer(imageUrl)
        } catch (error) {
          console.error('Error deleting image:', imageUrl, error)
          // Continue with deletion even if image deletion fails
        }
      }
    }

    await withRetry(() => prisma.brand.delete({
      where: { id }
    }))

    return NextResponse.json({ message: 'Brand deleted successfully' })
  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
