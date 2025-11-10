import { PrismaClient, TracerUpdate, Prisma } from '@prisma/client'

/**
 * Enriched audit log with user name
 */
export type EnrichedAuditLog = TracerUpdate & {
  changedByName?: string | null
}

/**
 * Helper function untuk mendapatkan audit log dari tracer_updates
 */
export class AuditLogService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Enrich logs with user names from users table
   * changedBy can be user ID or email, we'll try to find the user name
   */
  private async enrichLogsWithUserNames(logs: TracerUpdate[]): Promise<EnrichedAuditLog[]> {
    if (logs.length === 0) {
      return logs.map(log => ({ ...log, changedByName: null }))
    }

    // Collect unique changedBy values
    const changedByValues = new Set<string>()
    logs.forEach(log => {
      if (log.changedBy) {
        changedByValues.add(log.changedBy)
      }
    })

    if (changedByValues.size === 0) {
      return logs.map(log => ({ ...log, changedByName: null }))
    }

    // Query users by ID or email
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: { in: Array.from(changedByValues) } },
          { email: { in: Array.from(changedByValues) } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    // Create a map: changedBy value -> user name
    const userMap = new Map<string, string>()
    users.forEach(user => {
      userMap.set(user.id, user.name)
      userMap.set(user.email, user.name)
    })

    // Enrich logs with user names
    return logs.map(log => {
      if (!log.changedBy) {
        return { ...log, changedByName: null }
      }

      // Try to get user name from map
      const userName = userMap.get(log.changedBy)
      
      if (userName) {
        return { ...log, changedByName: userName }
      }

      // If not found, check if changedBy looks like an email
      // If it's an email, use it as display name
      // Otherwise, it might be an ID that doesn't exist in users table anymore
      if (log.changedBy.includes('@')) {
        return { ...log, changedByName: log.changedBy }
      }

      // If it's an ID but user not found, return null (will display as "System" in UI)
      return { ...log, changedByName: null }
    })
  }

  /**
   * Get audit logs berdasarkan tabel sumber
   * Includes user name from users table
   */
  async getLogsByTable(sourceTable: string, limit: number = 100) {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        sourceTable,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    // Enrich with user names
    return this.enrichLogsWithUserNames(logs)
  }

  /**
   * Get audit logs berdasarkan record ID
   */
  async getLogsByRecord(sourceTable: string, sourceKey: string): Promise<EnrichedAuditLog[]> {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        sourceTable,
        sourceKey,
      },
      orderBy: {
        changedAt: 'desc',
      },
    })

    return this.enrichLogsWithUserNames(logs)
  }

  /**
   * Get audit logs berdasarkan user
   */
  async getLogsByUser(changedBy: string, limit: number = 100): Promise<EnrichedAuditLog[]> {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        changedBy,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    return this.enrichLogsWithUserNames(logs)
  }

  /**
   * Get audit logs berdasarkan action type
   */
  async getLogsByAction(actionType: 'INSERT' | 'UPDATE' | 'DELETE', limit: number = 100): Promise<EnrichedAuditLog[]> {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        actionType,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    return this.enrichLogsWithUserNames(logs)
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
  async getLogsByBrand(brandId: string, limit: number = 100): Promise<EnrichedAuditLog[]> {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        brandId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    return this.enrichLogsWithUserNames(logs)
  }

  /**
   * Get audit logs berdasarkan category ID
   */
  async getLogsByCategory(categoryId: string, limit: number = 100): Promise<EnrichedAuditLog[]> {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        categoryId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    return this.enrichLogsWithUserNames(logs)
  }

  /**
   * Get audit logs berdasarkan subcategory ID
   */
  async getLogsBySubcategory(subcategoryId: string, limit: number = 100): Promise<EnrichedAuditLog[]> {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        subcategoryId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    return this.enrichLogsWithUserNames(logs)
  }

  /**
   * Get audit logs berdasarkan knowledge ID
   */
  async getLogsByKnowledge(knowledgeId: string, limit: number = 100): Promise<EnrichedAuditLog[]> {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        knowledgeId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    return this.enrichLogsWithUserNames(logs)
  }

  /**
   * Get audit logs berdasarkan SOP ID
   */
  async getLogsBySOP(sopId: string, limit: number = 100): Promise<EnrichedAuditLog[]> {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        sopId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    return this.enrichLogsWithUserNames(logs)
  }

  /**
   * Get audit logs berdasarkan quality training ID
   */
  async getLogsByQualityTraining(qualityTrainingId: string, limit: number = 100): Promise<EnrichedAuditLog[]> {
    const logs = await this.prisma.tracerUpdate.findMany({
      where: {
        qualityTrainingId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    return this.enrichLogsWithUserNames(logs)
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
  }, limit: number = 100): Promise<EnrichedAuditLog[]> {
    const where: {
      brandId?: string
      categoryId?: string
      subcategoryId?: string
      knowledgeId?: string
      sopId?: string
      qualityTrainingId?: string
      sourceTable?: string
      actionType?: string
      changedBy?: string
      changedAt?: {
        gte?: Date
        lte?: Date
      }
    } = {}

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

    const logs = await this.prisma.tracerUpdate.findMany({
      where,
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    })

    return this.enrichLogsWithUserNames(logs)
  }

  /**
   * Get audit logs dengan related table changes
   * Menambahkan perubahan dari tabel terkait berdasarkan stored related IDs
   * 
   * Field name akan di-prefix dengan nama tabel untuk membedakan:
   * - detail_produks: "detail_produks.name", "detail_produks.detail"
   * - produks: "produks.name", "produks.description"
   * - brands: "brands.name"
   * 
   * Contoh:
   * - Untuk detail_produks: juga ambil perubahan dari produks, subkategori_produks, kategori_produks, brands
   * - Untuk detail_sops: juga ambil perubahan dari jenis_sops, sops, kategori_sops
   */
  async getLogsWithRelatedChanges(filters: {
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
    includeRelated?: boolean // flag untuk include related changes
  }, limit: number = 100): Promise<EnrichedAuditLog[]> {
    // Get main logs
    const mainLogs = await this.getLogsWithFilters(filters, limit * 3)

    if (!filters.includeRelated) {
      // Main logs sudah di-enrich dengan user names
      return mainLogs.map(log => ({
        ...log,
        displayFieldName: log.fieldName, // No prefix for main table
        isRelated: false
      }))
    }

    // Collect unique IDs from main logs
    const brandIds = new Set<string>()
    const categoryIds = new Set<string>()
    const subcategoryIds = new Set<string>()
    const knowledgeIds = new Set<string>()
    const sopIds = new Set<string>()
    const qualityTrainingIds = new Set<string>()

    // Extract IDs from main logs
    const detailProdukIds = new Set<string>()
    const detailSopIds = new Set<string>()
    
    for (const log of mainLogs) {
      if (log.brandId) brandIds.add(log.brandId)
      if (log.categoryId) categoryIds.add(log.categoryId)
      if (log.subcategoryId) subcategoryIds.add(log.subcategoryId)
      if (log.knowledgeId) knowledgeIds.add(log.knowledgeId)
      if (log.sopId) sopIds.add(log.sopId)
      if (log.qualityTrainingId) qualityTrainingIds.add(log.qualityTrainingId)

      // Collect detail_produks IDs to batch query
      if (log.sourceTable === 'detail_produks' && log.sourceKey) {
        detailProdukIds.add(log.sourceKey)
      }

      // Collect detail_sops IDs to batch query
      if (log.sourceTable === 'detail_sops' && log.sourceKey) {
        detailSopIds.add(log.sourceKey)
      }
    }

    // Batch query for produkIds from detail_produks
    const produkIds = new Set<string>()
    if (detailProdukIds.size > 0) {
      try {
        const detailProduks = await this.prisma.detailProduk.findMany({
          where: { id: { in: Array.from(detailProdukIds) } },
          select: { produkId: true }
        })
        for (const dp of detailProduks) {
          if (dp.produkId) produkIds.add(dp.produkId)
        }
      } catch (error) {
        console.warn('Could not batch fetch detail_produks:', error)
      }
    }

    // Batch query for jenisSopIds from detail_sops
    const jenisSopIds = new Set<string>()
    if (detailSopIds.size > 0) {
      try {
        const detailSops = await this.prisma.detailSOP.findMany({
          where: { id: { in: Array.from(detailSopIds) } },
          select: { jenisSOPId: true }
        })
        for (const ds of detailSops) {
          if (ds.jenisSOPId) jenisSopIds.add(ds.jenisSOPId)
        }
      } catch (error) {
        console.warn('Could not batch fetch detail_sops:', error)
      }
    }

    const relatedLogs: Array<EnrichedAuditLog & { displayFieldName: string; isRelated: boolean }> = []
    const tableRelations: Record<string, string[]> = {
      'detail_produks': ['produks', 'subkategori_produks', 'kategori_produks', 'brands'],
      'produks': ['subkategori_produks', 'kategori_produks', 'brands'],
      'subkategori_produks': ['kategori_produks', 'brands'],
      'kategori_produks': ['brands'],
      'detail_sops': ['jenis_sops', 'sops', 'kategori_sops'],
      'jenis_sops': ['sops', 'kategori_sops'],
      'sops': ['kategori_sops'],
      'produk_jenis_detail_knowledges': ['jenis_detail_knowledges', 'detail_knowledges', 'knowledges'],
      'jenis_detail_knowledges': ['detail_knowledges', 'knowledges'],
      'detail_knowledges': ['knowledges'],
      'subdetail_quality_trainings': ['detail_quality_trainings', 'jenis_quality_trainings', 'quality_trainings'],
      'detail_quality_trainings': ['jenis_quality_trainings', 'quality_trainings'],
      'jenis_quality_trainings': ['quality_trainings'],
    }

    const sourceTable = filters.sourceTable || (mainLogs.length > 0 ? mainLogs[0].sourceTable : null)
    const relatedTables = sourceTable ? tableRelations[sourceTable] || [] : []

    // Build query conditions for related tables
    const whereConditions: Prisma.TracerUpdateWhereInput[] = []

    // Product-related tables
    if (relatedTables.includes('produks')) {
      // If we have specific produkIds (from detail_produks), query those first
      if (produkIds.size > 0) {
        whereConditions.push({
          sourceTable: 'produks',
          sourceKey: { in: Array.from(produkIds) },
        })
      }
      // Also include produk changes by brandId/categoryId/subcategoryId for broader context
      if (brandIds.size > 0 || categoryIds.size > 0 || subcategoryIds.size > 0) {
        whereConditions.push({
          sourceTable: 'produks',
          OR: [
            ...(brandIds.size > 0 ? [{ brandId: { in: Array.from(brandIds) } }] : []),
            ...(categoryIds.size > 0 ? [{ categoryId: { in: Array.from(categoryIds) } }] : []),
            ...(subcategoryIds.size > 0 ? [{ subcategoryId: { in: Array.from(subcategoryIds) } }] : []),
          ].filter(Boolean),
        })
      }
    }

    if (relatedTables.includes('subkategori_produks') && subcategoryIds.size > 0) {
      // Query by sourceKey (more accurate) or subcategoryId (broader)
      whereConditions.push({
        sourceTable: 'subkategori_produks',
        OR: [
          { sourceKey: { in: Array.from(subcategoryIds) } },
          { subcategoryId: { in: Array.from(subcategoryIds) } },
        ],
      })
    }

    if (relatedTables.includes('kategori_produks') && categoryIds.size > 0) {
      // Query by sourceKey (more accurate) or categoryId (broader)
      whereConditions.push({
        sourceTable: 'kategori_produks',
        OR: [
          { sourceKey: { in: Array.from(categoryIds) } },
          { categoryId: { in: Array.from(categoryIds) } },
        ],
      })
    }

    if (relatedTables.includes('brands') && brandIds.size > 0) {
      // Query by sourceKey (more accurate) or brandId (broader)
      whereConditions.push({
        sourceTable: 'brands',
        OR: [
          { sourceKey: { in: Array.from(brandIds) } },
          { brandId: { in: Array.from(brandIds) } },
        ],
      })
    }

    // SOP-related tables
    if (relatedTables.includes('sops') && sopIds.size > 0) {
      // Query by sourceKey (more accurate) or sopId (broader)
      whereConditions.push({
        sourceTable: 'sops',
        OR: [
          { sourceKey: { in: Array.from(sopIds) } },
          { sopId: { in: Array.from(sopIds) } },
        ],
      })
    }

    if (relatedTables.includes('kategori_sops') && sopIds.size > 0) {
      // Need to get kategoriSOPId from sops first
      const sops = await this.prisma.sOP.findMany({
        where: { id: { in: Array.from(sopIds) } },
        select: { kategoriSOPId: true }
      })
      const kategoriSopIds = sops.map(s => s.kategoriSOPId).filter(Boolean) as string[]
      if (kategoriSopIds.length > 0) {
        whereConditions.push({
          sourceTable: 'kategori_sops',
          sourceKey: { in: kategoriSopIds },
        })
      }
    }

    if (relatedTables.includes('jenis_sops')) {
      // If we have specific jenisSopIds (from detail_sops), query those first
      if (jenisSopIds.size > 0) {
        whereConditions.push({
          sourceTable: 'jenis_sops',
          sourceKey: { in: Array.from(jenisSopIds) },
        })
      }
      // Also get jenis_sops that belong to these sops
      if (sopIds.size > 0) {
        const jenisSops = await this.prisma.jenisSOP.findMany({
          where: { sopId: { in: Array.from(sopIds) } },
          select: { id: true }
        })
        const fetchedJenisSopIds = jenisSops.map(js => js.id)
        if (fetchedJenisSopIds.length > 0) {
          whereConditions.push({
            sourceTable: 'jenis_sops',
            sourceKey: { in: fetchedJenisSopIds },
          })
        }
      }
    }

    // Knowledge-related tables
    if (relatedTables.some(t => ['jenis_detail_knowledges', 'detail_knowledges', 'knowledges'].includes(t)) && knowledgeIds.size > 0) {
      whereConditions.push({
        sourceTable: { in: ['jenis_detail_knowledges', 'detail_knowledges', 'knowledges'] },
        knowledgeId: { in: Array.from(knowledgeIds) },
      })
    }

    // Quality Training-related tables
    if (relatedTables.some(t => ['detail_quality_trainings', 'jenis_quality_trainings', 'quality_trainings'].includes(t)) && qualityTrainingIds.size > 0) {
      whereConditions.push({
        sourceTable: { in: ['detail_quality_trainings', 'jenis_quality_trainings', 'quality_trainings'] },
        qualityTrainingId: { in: Array.from(qualityTrainingIds) },
      })
    }

    // Fetch related logs
    if (whereConditions.length > 0) {
      const baseWhere: Prisma.TracerUpdateWhereInput = {
        OR: whereConditions,
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.changedBy && { changedBy: filters.changedBy }),
        ...(filters.startDate && filters.endDate && {
          changedAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          }
        }),
      }

      const fetchedRelatedLogs = await this.prisma.tracerUpdate.findMany({
        where: baseWhere,
        orderBy: { changedAt: 'desc' },
        take: limit * 2,
      })

      // Enrich related logs with user names
      const enrichedRelatedLogs = await this.enrichLogsWithUserNames(fetchedRelatedLogs)
      
      // Add prefix to field names for related logs
      for (const log of enrichedRelatedLogs) {
        relatedLogs.push({
          ...log,
          displayFieldName: `${log.sourceTable}.${log.fieldName}`,
          isRelated: true
        })
      }
    }

    // Combine main logs and related logs
    const allLogsMap = new Map<string, EnrichedAuditLog & { displayFieldName: string; isRelated: boolean }>()

    // Add main logs with original field names (already enriched with user names)
    for (const log of mainLogs) {
      allLogsMap.set(log.id, {
        ...log,
        displayFieldName: log.fieldName,
        isRelated: false
      })
    }

    // Add related logs (already enriched with user names)
    for (const log of relatedLogs) {
      allLogsMap.set(log.id, log)
    }

    // Convert to array, sort, and limit
    const allLogs = Array.from(allLogsMap.values())
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
      .slice(0, limit)

    return allLogs
  }
}

