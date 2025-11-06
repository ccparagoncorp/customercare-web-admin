import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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
      where.subkategoriProduk = {
        ...where.subkategoriProduk,
        kategoriProdukId: categoryId
      }
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
      categoryId
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if ((!subcategoryId || subcategoryId === '-') && (!categoryId || categoryId === '-')) {
      return NextResponse.json({ error: 'Either category or subcategory is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const product = await withRetry(() => prisma.produk.create({
      data: {
        name,
        description,
        kapasitas,
        status: status || 'ACTIVE',
        harga: harga ?? undefined,
        images,
        subkategoriProdukId: subcategoryId && subcategoryId !== '-' ? subcategoryId : undefined,
        categoryId: (!subcategoryId || subcategoryId === '-') && categoryId && categoryId !== '-' ? categoryId : undefined,
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
    }))

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
