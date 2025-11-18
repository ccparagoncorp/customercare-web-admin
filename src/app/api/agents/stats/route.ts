import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const prisma = createPrismaClient()

    const [aggregate, categoryCounts] = await Promise.all([
      withRetry(() => prisma.agent.aggregate({
        _count: { _all: true },
        _avg: {
          qaScore: true,
          quizScore: true,
          typingTestScore: true
        }
      })),
      withRetry(() => prisma.agent.groupBy({
        by: ['category'],
        _count: { _all: true }
      }))
    ])

    const totalAgents = aggregate._count?._all ?? 0
    const totalSocMed = categoryCounts.find(group => group.category === 'socialMedia')?._count?._all ?? 0
    const totalECom = categoryCounts.find(group => group.category === 'eCommerce')?._count?._all ?? 0

    const averages = {
      qaScore: aggregate._avg?.qaScore ?? 0,
      quizScore: aggregate._avg?.quizScore ?? 0,
      typingTestScore: aggregate._avg?.typingTestScore ?? 0
    }

    return NextResponse.json({
      totals: {
        totalAgents,
        totalSocMed,
        totalECom
      },
      averages
    })
  } catch (error) {
    console.error('Error fetching agent stats:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

