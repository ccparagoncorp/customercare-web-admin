import { PrismaClient } from '@prisma/client'

/**
 * Helper function untuk mendapatkan audit log dari tracer_updates
 */
export class AuditLogService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get audit logs berdasarkan tabel sumber
   */
  async getLogsByTable(sourceTable: string, limit: number = 100) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        sourceTable,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get audit logs berdasarkan record ID
   */
  async getLogsByRecord(sourceTable: string, sourceKey: string) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        sourceTable,
        sourceKey,
      },
      orderBy: {
        changedAt: 'desc',
      },
    })
  }

  /**
   * Get audit logs berdasarkan user
   */
  async getLogsByUser(changedBy: string, limit: number = 100) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        changedBy,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get audit logs berdasarkan action type
   */
  async getLogsByAction(actionType: 'INSERT' | 'UPDATE' | 'DELETE', limit: number = 100) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        actionType,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get semua perubahan untuk sebuah record (history lengkap)
   */
  async getRecordHistory(sourceTable: string, sourceKey: string) {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        sourceTable,
        sourceKey,
      },
      orderBy: {
        changedAt: 'asc',
      },
    })

    // Group by change timestamp untuk mendapatkan snapshot pada setiap waktu
    const history: Array<{
      timestamp: Date
      action: string
      changedBy: string | null
      changes: Array<{
        field: string
        oldValue: string | null
        newValue: string | null
      }>
    }> = []

    let currentChange: typeof history[0] | null = null

    for (const log of logs) {
      if (!currentChange || currentChange.timestamp.getTime() !== log.changedAt.getTime()) {
        if (currentChange) {
          history.push(currentChange)
        }
        currentChange = {
          timestamp: log.changedAt,
          action: log.actionType,
          changedBy: log.changedBy,
          changes: [],
        }
      }

      if (currentChange) {
        currentChange.changes.push({
          field: log.fieldName,
          oldValue: log.oldValue,
          newValue: log.newValue,
        })
      }
    }

    if (currentChange) {
      history.push(currentChange)
    }

    return history
  }
}

