import { PrismaClient } from '@prisma/client'

/**
 * Helper function untuk mendapatkan audit log dari tracer_updates
 */
export class AuditLogService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

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

  /**
   * Get audit logs berdasarkan brand ID
   * Mengembalikan semua perubahan terkait brand tersebut (produk, kategori, dll)
   */
  async getLogsByBrand(brandId: string, limit: number = 100) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        brandId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get audit logs berdasarkan category ID
   */
  async getLogsByCategory(categoryId: string, limit: number = 100) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        categoryId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get audit logs berdasarkan subcategory ID
   */
  async getLogsBySubcategory(subcategoryId: string, limit: number = 100) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        subcategoryId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get audit logs berdasarkan knowledge ID
   */
  async getLogsByKnowledge(knowledgeId: string, limit: number = 100) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        knowledgeId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get audit logs berdasarkan SOP ID
   */
  async getLogsBySOP(sopId: string, limit: number = 100) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        sopId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get audit logs berdasarkan quality training ID
   */
  async getLogsByQualityTraining(qualityTrainingId: string, limit: number = 100) {
    return this.prisma.tracerUpdate.findMany({
      where: {
        qualityTrainingId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * Get audit logs dengan filter kombinasi
   * Support untuk filter berdasarkan multiple related IDs
   */
  async getLogsWithFilters(filters: {
    brandId?: string
    categoryId?: string
    subcategoryId?: string
    knowledgeId?: string
    sopId?: string
    qualityTrainingId?: string
    sourceTable?: string
    actionType?: 'INSERT' | 'UPDATE' | 'DELETE'
    changedBy?: string
    startDate?: Date
    endDate?: Date
  }, limit: number = 100) {
    const where: any = {}

    if (filters.brandId) where.brandId = filters.brandId
    if (filters.categoryId) where.categoryId = filters.categoryId
    if (filters.subcategoryId) where.subcategoryId = filters.subcategoryId
    if (filters.knowledgeId) where.knowledgeId = filters.knowledgeId
    if (filters.sopId) where.sopId = filters.sopId
    if (filters.qualityTrainingId) where.qualityTrainingId = filters.qualityTrainingId
    if (filters.sourceTable) where.sourceTable = filters.sourceTable
    if (filters.actionType) where.actionType = filters.actionType
    if (filters.changedBy) where.changedBy = filters.changedBy
    if (filters.startDate || filters.endDate) {
      where.changedAt = {}
      if (filters.startDate) where.changedAt.gte = filters.startDate
      if (filters.endDate) where.changedAt.lte = filters.endDate
    }

    return this.prisma.tracerUpdate.findMany({
      where,
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })
  }
}

