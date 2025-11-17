import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry, withAuditUser } from '@/lib/prisma'
import { deleteProductFileServer } from '@/lib/supabase-storage'
import { Prisma, ProductStatus } from '@prisma/client'
import { normalizeEmptyStrings } from '@/lib/utils/normalize'

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
          brand: true,
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
    const body = normalizeEmptyStrings(await request.json()) as ProductUpdateBody & { brandId?: string | null }
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
      harga,
      brandId
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
    
    // Update product with audit tracking
    // IMPORTANT: Gunakan tx (transaction client) untuk semua operasi database
    await withAuditUser(prisma, user.id, async (tx) => {
      // Normalize IDs: convert empty string or '-' to null
      const normalizeId = (id: string | null | undefined): string | null => {
        if (!id || id.trim() === '' || id === '-') {
          return null
        }
        return id.trim()
      }

      const normalizedSubcategoryId = normalizeId(subcategoryId)
      const normalizedCategoryId = normalizeId(categoryId)
      const normalizedBrandId = normalizeId(brandId)

      // Determine final values with priority: subcategory > category > brand
      // Process all fields that are provided, respecting priority
      let finalSubkategoriProdukId: string | null | undefined = undefined
      let finalCategoryId: string | null | undefined = undefined
      let finalBrandId: string | null | undefined = undefined

      // Priority 1: Subcategory (highest priority)
      // If subcategory is provided, it takes precedence
      if (subcategoryId !== undefined) {
        if (normalizedSubcategoryId) {
          finalSubkategoriProdukId = normalizedSubcategoryId
          // When subcategory is set, clear category and brand (they come from subcategory)
          finalCategoryId = null
          finalBrandId = null
        } else {
          // Clear subcategory if empty
          finalSubkategoriProdukId = null
        }
      }

      // Priority 2: Category (only if subcategory is not set)
      // Process category only if subcategory is not being set to a valid value
      if (categoryId !== undefined && !normalizedSubcategoryId) {
        if (normalizedCategoryId) {
          finalCategoryId = normalizedCategoryId
          // When category is set, clear subcategory and brand (brand comes from category)
          if (finalSubkategoriProdukId === undefined) {
            finalSubkategoriProdukId = null
          }
          finalBrandId = null
        } else {
          // Clear category if empty
          finalCategoryId = null
        }
      }

      // Priority 3: Brand (only if neither subcategory nor category is set)
      // Process brand only if subcategory and category are not being set to valid values
      if (brandId !== undefined && !normalizedSubcategoryId && !normalizedCategoryId) {
        if (normalizedBrandId) {
          finalBrandId = normalizedBrandId
          // When brand is set directly, clear subcategory and category
          if (finalSubkategoriProdukId === undefined) {
            finalSubkategoriProdukId = null
          }
          if (finalCategoryId === undefined) {
            finalCategoryId = null
          }
        } else {
          // Clear brand if empty
          finalBrandId = null
        }
      }

      // Prepare update data
      // Use same pattern as POST route (line 171-182) - direct field assignment works at runtime
      // Prisma schema supports direct foreign key field assignment (brandId, categoryId, subkategoriProdukId)
      const updateData = {
        name,
        description,
        kapasitas,
        status: (status as ProductStatus) || ProductStatus.ACTIVE,
        harga: harga ?? undefined,
        images,
        updatedBy,
        updateNotes,
        // Add relationship fields only if they were determined (not undefined)
        ...(finalSubkategoriProdukId !== undefined && { subkategoriProdukId: finalSubkategoriProdukId }),
        ...(finalCategoryId !== undefined && { categoryId: finalCategoryId }),
        ...(finalBrandId !== undefined && { brandId: finalBrandId }),
      }

      // Update product
      // Note: Prisma.ProdukUpdateInput type doesn't expose direct foreign key fields (brandId, categoryId, subkategoriProdukId)
      // in TypeScript, but the schema supports them and they work at runtime.
      // This is the same pattern used in POST route (line 171-182) for creating products.
      // We use type assertion to bypass TypeScript's type checking while maintaining runtime correctness.
      await tx.produk.update({
        where: { id },
        data: updateData as unknown as Prisma.ProdukUpdateInput
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
        brand: true,
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
