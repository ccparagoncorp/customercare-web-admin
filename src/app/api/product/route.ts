import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry, withAuditUser } from '@/lib/prisma'
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const categoryId = searchParams.get('categoryId')
    const subcategoryId = searchParams.get('subcategoryId')
    const search = searchParams.get('search')

    const where: Prisma.ProdukWhereInput = {}

    if (brandId) {
      where.subkategoriProduk = {
        kategoriProduk: {
          brandId
        }
      }
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (subcategoryId) {
      where.subkategoriProdukId = subcategoryId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { kapasitas: { contains: search, mode: 'insensitive' } }
      ]
    }

    const prisma = createPrismaClient()
    const products = await withRetry(() => prisma.produk.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      description, 
      kapasitas,
      status,
      images = [], 
      subcategoryId,
      details = [],
      harga,
      categoryId,
      brandId
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const product = await withAuditUser(prisma, user.id, async (tx) => {
      // Prepare data for category and subcategory
      // If subcategory is provided, use it (subcategory already has a category)
      // Otherwise, use category if provided
      // If both are "-" or empty but brandId is provided, create/get default category for brand
      const subkategoriProdukId = subcategoryId && subcategoryId !== '-' ? subcategoryId : null
      let categoryIdValue: string | null = null

      if (subcategoryId && subcategoryId !== '-') {
        // If subcategory is provided, use it (category is automatically linked through subcategory)
        categoryIdValue = null
      } else if (categoryId && categoryId !== '-') {
        // If category is provided and not "-", use it
        categoryIdValue = categoryId
      } else if ((!categoryId || categoryId === '-') && brandId) {
        // If category is "-" or empty but brandId is provided, 
        // find or create a default category named "-" for this brand
        let defaultCategory = await tx.kategoriProduk.findFirst({
          where: {
            name: '-',
            brandId: brandId
          }
        })

        if (!defaultCategory) {
          // Create default category for brand
          defaultCategory = await tx.kategoriProduk.create({
            data: {
              name: '-',
              brandId: brandId,
              images: [],
              createdBy: user.email || 'system'
            }
          })
        }

        categoryIdValue = defaultCategory.id
      } else {
        // No category, no brand, set to null (product with only brand - but this shouldn't happen if brand is selected)
        categoryIdValue = null
      }

      return await tx.produk.create({
        data: {
          name,
          description,
          kapasitas,
          status: (status as ProductStatus) || ProductStatus.ACTIVE,
          harga: harga ?? undefined,
          images,
          subkategoriProdukId,
          categoryId: categoryIdValue,
          createdBy: user.email || 'system',
          detailProduks: {
            create: (details as DetailInput[]).map((detail: DetailInput) => ({
              name: detail.name,
              detail: detail.detail,
              images: detail.images || []
            }))
          }
        },
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
      })
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
