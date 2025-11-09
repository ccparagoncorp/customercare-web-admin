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
    const andConditions: Prisma.ProdukWhereInput[] = []

    // Brand filter: search by direct brandId or through category/subcategory
    if (brandId) {
      andConditions.push({
        OR: [
          { brandId: brandId },
          {
            subkategoriProduk: {
              kategoriProduk: {
                brandId
              }
            }
          },
          {
            kategoriProduk: {
              brandId
            }
          }
        ]
      })
    }

    // Category filter
    if (categoryId) {
      andConditions.push({ categoryId: categoryId })
    }

    // Subcategory filter
    if (subcategoryId) {
      andConditions.push({ subkategoriProdukId: subcategoryId })
    }

    // Search filter
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { kapasitas: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    // Combine all conditions with AND
    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    const prisma = createPrismaClient()
    const products = await withRetry(() => prisma.produk.findMany({
      where,
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
      // Prepare data for category, subcategory, and brand
      // Priority: subcategory > category > brand (direct)
      // If subcategory is provided, use it (brandId will come from subcategory's category's brand)
      // If only category is provided, use it (brandId will come from category's brand)
      // If only brandId is provided (no category/subcategory), use brandId directly
      
      const subkategoriProdukId = subcategoryId && subcategoryId !== '-' ? subcategoryId : null
      const categoryIdValue = (!subcategoryId || subcategoryId === '-') && categoryId && categoryId !== '-' ? categoryId : null
      
      // brandId: only set if no subcategory and no category (product with only brand)
      // If subcategory or category exists, brandId will be automatically linked through them
      const brandIdValue = (!subkategoriProdukId && !categoryIdValue) && brandId && brandId !== '-' ? brandId : null

      return await tx.produk.create({
        data: {
          name,
          description,
          kapasitas,
          status: (status as ProductStatus) || ProductStatus.ACTIVE,
          harga: harga ?? undefined,
          images,
          brandId: brandIdValue,
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
      })
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
