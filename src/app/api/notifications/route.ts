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
      // Use plain object type instead of Prisma types to avoid type errors
      const queryWhere: {
        changedAt: {
          gte: Date
          gt?: Date
        }
      } = {
        changedAt: {
          gte: since ? new Date(since) : sevenDaysAgoDate,
          ...(since ? { gt: new Date(since) } : {}),
        },
      }

      // Get notifications and unread count in parallel
      // Type assertion: Prisma client includes tracerUpdate model after generation
      // The model exists at runtime - using type assertion until TS server recognizes it
      interface TracerUpdateFull {
        id: string
        sourceTable: string
        sourceKey: string
        fieldName: string
        oldValue: string | null
        newValue: string | null
        actionType: string
        changedAt: Date
        changedBy: string | null
      }

      interface TracerUpdatePartial {
        sourceTable: string
        sourceKey: string
        changedAt: Date
      }

      interface PrismaClientWithTracerUpdate {
        tracerUpdate: {
          findMany: (args?: {
            where?: {
              changedAt?: {
                gte?: Date
                gt?: Date
              }
            }
            orderBy?: {
              changedAt?: 'asc' | 'desc'
            }
            take?: number
            select?: {
              sourceTable?: boolean
              sourceKey?: boolean
              changedAt?: boolean
            }
          }) => Promise<TracerUpdateFull[] | TracerUpdatePartial[]>
        }
        $disconnect: () => Promise<void>
      }
      const typedPrisma = prisma as unknown as PrismaClientWithTracerUpdate
      
      const [notifications, recentNotifications] = await Promise.all([
        // Get recent audit logs for notifications list
        withRetry(() => typedPrisma.tracerUpdate.findMany({
          where: queryWhere,
          orderBy: {
            changedAt: 'desc',
          },
          take: limit * 10, // Get more to group them properly
        })) as Promise<TracerUpdateFull[]>,
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
        })) as Promise<TracerUpdatePartial[]>
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

