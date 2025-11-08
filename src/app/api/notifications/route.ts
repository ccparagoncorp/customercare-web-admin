import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
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

// GET /api/notifications - Get recent audit logs as notifications
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
    const limit = parseInt(searchParams.get('limit') || '20')
    const since = searchParams.get('since') // Timestamp untuk get hanya notifikasi baru

    const prisma = createPrismaClient()

    try {
      // Calculate 7 days ago timestamp (used for both queries)
      const sevenDaysAgoDate = new Date()
      sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7)

      // Build query for notifications
      const where: Prisma.TracerUpdateWhereInput = {}
      
      // If since is provided, only get notifications after that timestamp
      if (since) {
        where.changedAt = {
          gt: new Date(since)
        }
      }

      const queryWhere: Prisma.TracerUpdateWhereInput = {
        ...where,
        changedAt: {
          ...(where.changedAt || {}),
          gte: since ? new Date(since) : sevenDaysAgoDate,
        },
      }

      // Get notifications and unread count in parallel
      // Type assertion: Prisma client includes tracerUpdate model after generation
      // The model exists at runtime - using type assertion until TS server recognizes it
      const typedPrisma = prisma as typeof prisma & {
        tracerUpdate: Prisma.TracerUpdateDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation>
      }
      
      const [notifications, recentNotifications] = await Promise.all([
        // Get recent audit logs for notifications list
        withRetry(() => typedPrisma.tracerUpdate.findMany({
          where: queryWhere,
          orderBy: {
            changedAt: 'desc',
          },
          take: limit * 10, // Get more to group them properly
        })),
        // Get recent notifications for unread count
        withRetry(() => typedPrisma.tracerUpdate.findMany({
          where: {
            changedAt: {
              gte: sevenDaysAgoDate,
            },
          },
          select: {
            sourceTable: true,
            sourceKey: true,
            changedAt: true,
          },
        }))
      ])

      // Group notifications by timestamp and sourceKey (same operation)
      const groupedNotifications = notifications.reduce((acc, log) => {
        const key = `${log.sourceTable}-${log.sourceKey}-${log.changedAt.getTime()}`
        if (!acc[key]) {
          acc[key] = {
            id: key,
            sourceTable: log.sourceTable,
            sourceKey: log.sourceKey,
            actionType: log.actionType,
            changedAt: log.changedAt,
            changedBy: log.changedBy,
            changes: [],
          }
        }
        acc[key].changes.push({
          fieldName: log.fieldName,
          oldValue: log.oldValue,
          newValue: log.newValue,
        })
        return acc
      }, {} as Record<string, {
        id: string
        sourceTable: string
        sourceKey: string
        actionType: string
        changedAt: Date
        changedBy: string | null
        changes: Array<{
          fieldName: string
          oldValue: string | null
          newValue: string | null
        }>
      }>)

      const notificationsArray = Object.values(groupedNotifications)
        .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
        .slice(0, limit) // Limit to requested number
        .map(notif => ({
          ...notif,
          changedAt: notif.changedAt.toISOString(), // Convert Date to string
        }))

      // Group and count unique notifications for unread count
      const uniqueKeys = new Set<string>()
      recentNotifications.forEach(log => {
        const key = `${log.sourceTable}-${log.sourceKey}-${log.changedAt.getTime()}`
        uniqueKeys.add(key)
      })

      const unreadCount = uniqueKeys.size

      return NextResponse.json({
        notifications: notificationsArray,
        unreadCount,
        total: notificationsArray.length,
      })
    } finally {
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

