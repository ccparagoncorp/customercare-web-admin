import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import { AuditLogService } from '@/lib/audit'

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

// GET /api/audit - Get audit logs
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
    const table = searchParams.get('table')
    const recordId = searchParams.get('recordId')
    const action = searchParams.get('action') as 'INSERT' | 'UPDATE' | 'DELETE' | null
    const limit = parseInt(searchParams.get('limit') || '100')

    const prisma = createPrismaClient()
    const auditService = new AuditLogService(prisma)

    try {
      let logs

      if (table && recordId) {
        // Get logs for specific record
        logs = await withRetry(() => auditService.getLogsByRecord(table, recordId))
      } else if (table) {
        // Get logs for table
        logs = await withRetry(() => auditService.getLogsByTable(table, limit))
      } else if (action) {
        // Get logs by action type
        logs = await withRetry(() => auditService.getLogsByAction(action, limit))
      } else {
        return NextResponse.json({ error: 'Table or action parameter is required' }, { status: 400 })
      }

      return NextResponse.json({ logs })
    } finally {
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

