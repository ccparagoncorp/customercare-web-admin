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

    const [agents, categoryCounts] = await Promise.all([
      withRetry(() => prisma.agent.findMany({
        select: { id: true }
      })),
      withRetry(() => prisma.agent.groupBy({
        by: ['category'],
        _count: { _all: true }
      }))
    ])

    const totalAgents = agents.length
    const totalSocMed = categoryCounts.find(group => group.category === 'socialMedia')?._count?._all ?? 0
    const totalECom = categoryCounts.find(group => group.category === 'eCommerce')?._count?._all ?? 0

    // Get latest performance for each agent
    const latestPerformances = await Promise.all(
      agents.map(agent =>
        withRetry(() => prisma.performance.findFirst({
          where: { agentId: agent.id },
          orderBy: { timestamp: 'desc' },
          select: {
            qaScore: true,
            quizScore: true,
            typingTestScore: true
          }
        }))
      )
    )

    // Calculate averages from latest performances (treat missing scores as 0)
    const averages = totalAgents > 0 ? {
      qaScore: latestPerformances.reduce((sum, p) => sum + (p?.qaScore ?? 0), 0) / totalAgents,
      quizScore: latestPerformances.reduce((sum, p) => sum + (p?.quizScore ?? 0), 0) / totalAgents,
      typingTestScore: latestPerformances.reduce((sum, p) => sum + (p?.typingTestScore ?? 0), 0) / totalAgents
    } : {
      qaScore: 0,
      quizScore: 0,
      typingTestScore: 0
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

