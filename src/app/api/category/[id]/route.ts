import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import { deleteProductFileServer } from '@/lib/supabase-storage'

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
    
    // Try to find as category first
    let category = await withRetry(() => prisma.kategoriProduk.findUnique({
      where: { id },
      include: {
        brand: true,
        subkategoriProduks: true
      }
    }))

    if (category) {
      return NextResponse.json({ ...category, type: 'category' })
    }

    // If not found as category, try as subcategory
    const subcategory = await withRetry(() => prisma.subkategoriProduk.findUnique({
      where: { id },
      include: {
        kategoriProduk: {
          include: {
            brand: true
          }
        }
      }
    }))

    if (subcategory) {
      return NextResponse.json({ ...subcategory, type: 'subcategory' })
    }

    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  } catch (error) {
    console.error('Error fetching category:', error)
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
    const { name, description, images = [], type = 'category', brandId, parentCategoryId, updateNotes, updatedBy } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!updateNotes) {
      return NextResponse.json({ error: 'Update notes is required' }, { status: 400 })
    }

    if (!updatedBy) {
      return NextResponse.json({ error: 'Updated by is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    
    if (type === 'category') {
      if (!brandId) {
        return NextResponse.json({ error: 'Brand is required for category' }, { status: 400 })
      }

      const category = await withRetry(() => prisma.kategoriProduk.update({
        where: { id },
        data: {
          name,
          description,
          images,
          brandId,
          updatedBy,
          updateNotes
        }
      }))

      return NextResponse.json(category)
    } else if (type === 'subcategory') {
      if (!parentCategoryId) {
        return NextResponse.json({ error: 'Parent category is required for subcategory' }, { status: 400 })
      }

      const subcategory = await withRetry(() => prisma.subkategoriProduk.update({
        where: { id },
        data: {
          name,
          description,
          images,
          kategoriProdukId: parentCategoryId,
          updatedBy,
          updateNotes
        }
      }))

      return NextResponse.json(subcategory)
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error updating category:', error)
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
    const { type = 'category' } = await request.json()

    const prisma = createPrismaClient()
    
    if (type === 'category') {
      // Check if category has associated subcategories
      const categoryWithSubcategories = await withRetry(() => prisma.kategoriProduk.findUnique({
        where: { id },
        include: {
          subkategoriProduks: true
        }
      }))

      if (categoryWithSubcategories?.subkategoriProduks.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete category with associated subcategories' 
        }, { status: 400 })
      }

      // Delete images from Supabase Storage
      if (categoryWithSubcategories?.images && categoryWithSubcategories.images.length > 0) {
        for (const imageUrl of categoryWithSubcategories.images) {
          try {
            await deleteProductFileServer(imageUrl)
          } catch (error) {
            console.error('Error deleting image:', imageUrl, error)
            // Continue with deletion even if image deletion fails
          }
        }
      }

      await withRetry(() => prisma.kategoriProduk.delete({
        where: { id }
      }))
    } else if (type === 'subcategory') {
      // Check if subcategory has associated products
      const subcategoryWithProducts = await withRetry(() => prisma.subkategoriProduk.findUnique({
        where: { id },
        include: {
          produks: true
        }
      }))

      if (subcategoryWithProducts?.produks.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete subcategory with associated products' 
        }, { status: 400 })
      }

      // Delete images from Supabase Storage
      if (subcategoryWithProducts?.images && subcategoryWithProducts.images.length > 0) {
        for (const imageUrl of subcategoryWithProducts.images) {
          try {
            await deleteProductFileServer(imageUrl)
          } catch (error) {
            console.error('Error deleting image:', imageUrl, error)
            // Continue with deletion even if image deletion fails
          }
        }
      }

      await withRetry(() => prisma.subkategoriProduk.delete({
        where: { id }
      }))
    }

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
