import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry, withAuditUser } from '@/lib/prisma'

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
    const items = await withRetry(() => prisma.qualityTraining.findMany({
      include: {
        jenisQualityTrainings: true
      },
      orderBy: { createdAt: 'desc' }
    }))
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching QualityTraining:', error)
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
    const { title, description, logos = [] } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    const created = await withAuditUser(prisma, user.id, async () => {
      return await withRetry(() => prisma.qualityTraining.create({
        data: {
          title,
          description,
          logos,
          createdBy: user.email || 'system'
        },
        include: {
          jenisQualityTrainings: true
        }
      }))
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating QualityTraining:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


