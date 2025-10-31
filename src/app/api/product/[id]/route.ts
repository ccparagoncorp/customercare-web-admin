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
    const product = await withRetry(() => prisma.produk.findUnique({
      where: { id },
      include: {
        subkategoriProduk: {
          include: {
            kategoriProduk: {
              include: {
                brand: true
              }
            }
          }
        },
        kategoriProduk: {
          include: {
            brand: true
          }
        },
        detailProduks: true
      }
    }))

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
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
    const { 
      name, 
      description, 
      kapasitas,
      status,
      images = [], 
      subcategoryId,
      categoryId,
      details = [],
      updateNotes,
      updatedBy
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if ((!subcategoryId || subcategoryId === '-') && (!categoryId || categoryId === '-')) {
      return NextResponse.json({ error: 'Either category or subcategory is required' }, { status: 400 })
    }

    if (!updateNotes) {
      return NextResponse.json({ error: 'Update notes is required' }, { status: 400 })
    }

    if (!updatedBy) {
      return NextResponse.json({ error: 'Updated by is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    
    // Update product
    const product = await withRetry(() => prisma.produk.update({
      where: { id },
      data: {
        name,
        description,
        kapasitas,
        status: status || 'ACTIVE',
        harga: (body as any).harga ?? undefined,
        images,
        subkategoriProdukId: subcategoryId && subcategoryId !== '-' ? subcategoryId : undefined,
        categoryId: (!subcategoryId || subcategoryId === '-') && categoryId && categoryId !== '-' ? categoryId : undefined,
        updatedBy,
        updateNotes
      }
    }))

    // Update details
    if (details.length > 0) {
      // Delete existing details
      await withRetry(() => prisma.detailProduk.deleteMany({
        where: { produkId: id }
      }))

      // Create new details
      await withRetry(() => prisma.detailProduk.createMany({
        data: details.map((detail: any) => ({
          name: detail.name,
          detail: detail.detail,
          images: detail.images || [],
          produkId: id
        }))
      }))
    }

    const updatedProduct = await withRetry(() => prisma.produk.findUnique({
      where: { id },
      include: {
        subkategoriProduk: {
          include: {
            kategoriProduk: {
              include: {
                brand: true
              }
            }
          }
        },
        kategoriProduk: true,
        detailProduks: true
      }
    }))

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Error updating product:', error)
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
    
    // Get product with details to delete all images
    const productWithDetails = await withRetry(() => prisma.produk.findUnique({
      where: { id },
      include: {
        detailProduks: true
      }
    }))

    if (productWithDetails) {
      // Delete product images
      if (productWithDetails.images && productWithDetails.images.length > 0) {
        for (const imageUrl of productWithDetails.images) {
          try {
            await deleteProductFileServer(imageUrl)
          } catch (error) {
            console.error('Error deleting product image:', imageUrl, error)
          }
        }
      }

      // Delete detail images
      for (const detail of productWithDetails.detailProduks) {
        if (detail.images && detail.images.length > 0) {
          for (const imageUrl of detail.images) {
            try {
              await deleteProductFileServer(imageUrl)
            } catch (error) {
              console.error('Error deleting detail image:', imageUrl, error)
            }
          }
        }
      }
    }

    await withRetry(() => prisma.produk.delete({
      where: { id }
    }))

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
