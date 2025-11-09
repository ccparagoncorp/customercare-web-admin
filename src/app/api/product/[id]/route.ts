import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry, withAuditUser } from '@/lib/prisma'
import { deleteProductFileServer } from '@/lib/supabase-storage'
import { Prisma, ProductStatus } from '@prisma/client'

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

interface DetailInput {
  name: string
  detail: string
  images?: string[]
}

interface ProductUpdateBody {
  name?: string
  description?: string
  kapasitas?: string
  status?: string
  images?: string[]
  subcategoryId?: string
  categoryId?: string
  details?: DetailInput[]
  updateNotes?: string
  updatedBy?: string
  harga?: number
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
    try {
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
    } finally {
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error('Error fetching product:', error)
    
    // Check if it's a database connection error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes("Can't reach database") || 
        errorMessage.includes("database server") ||
        errorMessage.includes("connection")) {
      return NextResponse.json({ 
        error: 'Database connection error. Please check your database connection and DATABASE_URL environment variable.' 
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: errorMessage.includes('Product not found') ? 'Product not found' : 'Error fetching product' 
    }, { status: 500 })
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
    const body = await request.json() as ProductUpdateBody
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
      updatedBy,
      harga
    } = body

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
    
    // Prepare update data with proper Prisma relation syntax
    const updateData: Prisma.ProdukUpdateInput = {
      name,
      description,
      kapasitas,
      status: (status as ProductStatus) || ProductStatus.ACTIVE,
      harga: harga ?? undefined,
      images,
      updatedBy,
      updateNotes
    }

    // Handle category and subcategory using Prisma relation syntax
    // Priority: subcategory > category (subcategory already has a category)
    // If subcategoryId is provided in request
    if (subcategoryId !== undefined) {
      if (subcategoryId && subcategoryId !== '-') {
        // Connect to subcategory (this automatically handles category through relation)
        updateData.subkategoriProduk = { connect: { id: subcategoryId } }
        updateData.kategoriProduk = { disconnect: true }
      } else {
        // subcategoryId is "-" or empty, disconnect subcategory
        updateData.subkategoriProduk = { disconnect: true }
        // Handle categoryId
        if (categoryId !== undefined) {
          if (categoryId && categoryId !== '-') {
            updateData.kategoriProduk = { connect: { id: categoryId } }
          } else {
            // categoryId is "-" or empty, disconnect category (product with only brand)
            updateData.kategoriProduk = { disconnect: true }
          }
        }
        // If categoryId is not provided but subcategoryId is "-", 
        // we still disconnect subcategory (category remains unchanged)
      }
    } else if (categoryId !== undefined) {
      // Only categoryId is provided (subcategoryId not in request)
      if (categoryId && categoryId !== '-') {
        updateData.kategoriProduk = { connect: { id: categoryId } }
        // Disconnect subcategory if it exists (category takes priority when no subcategory in request)
        updateData.subkategoriProduk = { disconnect: true }
      } else {
        // categoryId is "-" or empty, disconnect category (product with only brand)
        updateData.kategoriProduk = { disconnect: true }
        // Note: subcategoryId not in request, so it remains unchanged
      }
    }
    
    // Update product with audit tracking
    // IMPORTANT: Gunakan tx (transaction client) untuk semua operasi database
    await withAuditUser(prisma, user.id, async (tx) => {
      // Update product
      await tx.produk.update({
        where: { id },
        data: updateData
      })

      // Update details
      if (details.length > 0) {
        // Delete existing details
        await tx.detailProduk.deleteMany({
          where: { produkId: id }
        })

        // Create new details
        await tx.detailProduk.createMany({
          data: (details as DetailInput[]).map((detail: DetailInput) => ({
            name: detail.name,
            detail: detail.detail,
            images: detail.images || [],
            produkId: id
          }))
        })
      }
    })

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
      if (productWithDetails.detailProduks && productWithDetails.detailProduks.length > 0) {
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
    }

    await withAuditUser(prisma, user.id, async (tx) => {
      return await tx.produk.delete({
        where: { id }
      })
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
