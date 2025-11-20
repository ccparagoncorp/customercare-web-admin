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

    // Optimize: Get latest performance for all agents in a single batch query
    const agentIds = agents.map(a => a.id)
    let performancesMap = new Map<string, { qaScore: number; quizScore: number; typingTestScore: number }>()
    
    if (agentIds.length > 0) {
      // Fetch all performances for these agents in one query, then filter to latest per agent
      const allPerformances = await withRetry(() => prisma.performance.findMany({
        where: { agentId: { in: agentIds } },
        orderBy: { timestamp: 'desc' },
        select: {
          agentId: true,
          qaScore: true,
          quizScore: true,
          typingTestScore: true
        }
      }))

      // Group by agentId and take the first (latest) performance for each
      allPerformances.forEach(perf => {
        if (!performancesMap.has(perf.agentId)) {
          performancesMap.set(perf.agentId, {
            qaScore: perf.qaScore ?? 0,
            quizScore: perf.quizScore ?? 0,
            typingTestScore: perf.typingTestScore ?? 0
          })
        }
      })
    }

    // Calculate averages from latest performances (treat missing scores as 0)
    const latestPerformances = Array.from(performancesMap.values())
    const averages = totalAgents > 0 ? {
      qaScore: latestPerformances.reduce((sum, p) => sum + p.qaScore, 0) / totalAgents,
      quizScore: latestPerformances.reduce((sum, p) => sum + p.quizScore, 0) / totalAgents,
      typingTestScore: latestPerformances.reduce((sum, p) => sum + p.typingTestScore, 0) / totalAgents
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

