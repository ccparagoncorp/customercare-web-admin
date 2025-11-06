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

// GET /api/knowledge/[id] - Get knowledge by ID with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const item = await withRetry(async () => {
      const prisma = createPrismaClient()
      try {
        return await prisma.knowledge.findUnique({
          where: { id },
          select: {
            id: true,
            title: true,
            description: true,
            logos: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            updatedBy: true,
            detailKnowledges: {
              select: {
                id: true,
                name: true,
                description: true,
                logos: true,
                jenisDetailKnowledges: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logos: true,
                    produkJenisDetailKnowledges: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        logos: true
                      }
                    }
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        })
      } finally {
        await prisma.$disconnect()
      }
    })

    if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching knowledge item:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}


