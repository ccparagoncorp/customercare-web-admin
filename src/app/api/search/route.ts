import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
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

// GET /api/search - Global search across all tables
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
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        results: [],
        total: 0,
      })
    }

    const searchTerm = `%${query.trim()}%`
    const prisma = createPrismaClient()

    try {
      // Search across multiple tables in parallel
      const [
        brands,
        products,
        kategoriProduks,
        subkategoriProduks,
        sops,
        knowledges,
        users,
        agents,
      ] = await Promise.all([
        // Search Brands
        withRetry(() => prisma.brand.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            images: true,
          },
        })),

        // Search Products
        withRetry(() => prisma.produk.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { kapasitas: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            images: true,
            harga: true,
            status: true,
          },
        })),

        // Search Kategori Produk
        withRetry(() => prisma.kategoriProduk.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            images: true,
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })),

        // Search Subkategori Produk
        withRetry(() => prisma.subkategoriProduk.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            images: true,
            kategoriProduk: {
              select: {
                id: true,
                name: true,
                brand: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        })),

        // Search SOPs
        withRetry(() => prisma.sOP.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            kategoriSOP: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })),

        // Search Knowledges
        withRetry(() => prisma.knowledge.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            title: true,
            description: true,
            logos: true,
          },
        })),

        // Search Users
        withRetry(() => prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })),

        // Search Agents
        withRetry(() => prisma.agent.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            category: true,
          },
        })),
      ])

      // Format results
      const results = [
        ...brands.map(item => ({
          type: 'brand' as const,
          id: item.id,
          title: item.name,
          description: item.description,
          image: item.images[0] || null,
          url: `/admin/products?tab=brand`,
        })),
        ...products.map(item => ({
          type: 'product' as const,
          id: item.id,
          title: item.name,
          description: item.description,
          image: item.images[0] || null,
          url: `/admin/products/product/${item.id}`,
          metadata: {
            harga: item.harga?.toString(),
            status: item.status,
          },
        })),
        ...kategoriProduks.map(item => ({
          type: 'kategori' as const,
          id: item.id,
          title: item.name,
          description: item.description || `Brand: ${item.brand.name}`,
          image: item.images[0] || null,
          url: `/admin/products?tab=category`,
          metadata: {
            brand: item.brand.name,
          },
        })),
        ...subkategoriProduks.map(item => ({
          type: 'subkategori' as const,
          id: item.id,
          title: item.name,
          description: item.description || `Kategori: ${item.kategoriProduk.name}`,
          image: item.images[0] || null,
          url: `/admin/products?tab=subcategory`,
          metadata: {
            kategori: item.kategoriProduk.name,
            brand: item.kategoriProduk.brand.name,
          },
        })),
        ...sops.map(item => ({
          type: 'sop' as const,
          id: item.id,
          title: item.name,
          description: item.description || `Kategori: ${item.kategoriSOP.name}`,
          image: null,
          url: `/admin/sop`,
          metadata: {
            kategori: item.kategoriSOP.name,
          },
        })),
        ...knowledges.map(item => ({
          type: 'knowledge' as const,
          id: item.id,
          title: item.title,
          description: item.description,
          image: item.logos[0] || null,
          url: `/admin/knowledge`,
        })),
        ...users.map(item => ({
          type: 'user' as const,
          id: item.id,
          title: item.name,
          description: item.email,
          image: null,
          url: `/admin/users`,
          metadata: {
            role: item.role,
          },
        })),
        ...agents.map(item => ({
          type: 'agent' as const,
          id: item.id,
          title: item.name,
          description: item.email,
          image: null,
          url: `/admin/agents`,
          metadata: {
            category: item.category,
          },
        })),
      ]

      return NextResponse.json({
        results,
        total: results.length,
        query,
      })
    } finally {
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

