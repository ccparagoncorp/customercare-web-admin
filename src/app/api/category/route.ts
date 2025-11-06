import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prisma = createPrismaClient()
    
    // Get all categories and subcategories
    const categories = await withRetry(() => prisma.kategoriProduk.findMany({
      include: {
        brand: true,
        subkategoriProduks: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    const subcategories = await withRetry(() => prisma.subkategoriProduk.findMany({
      include: {
        kategoriProduk: {
          include: {
            brand: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    return NextResponse.json({
      categories,
      subcategories
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
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
    const { name, description, images = [], brandId, type = 'category', parentCategoryId } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    
    if (type === 'category') {
      if (!brandId) {
        return NextResponse.json({ error: 'Brand is required for category' }, { status: 400 })
      }

      const category = await withRetry(() => prisma.kategoriProduk.create({
        data: {
          name,
          description,
          images,
          brandId,
          createdBy: user.email || 'system'
        }
      }))

      return NextResponse.json(category, { status: 201 })
    } else if (type === 'subcategory') {
      if (!parentCategoryId) {
        return NextResponse.json({ error: 'Parent category is required for subcategory' }, { status: 400 })
      }

      const subcategory = await withRetry(() => prisma.subkategoriProduk.create({
        data: {
          name,
          description,
          images,
          kategoriProdukId: parentCategoryId,
          createdBy: user.email || 'system'
        }
      }))

      return NextResponse.json(subcategory, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
