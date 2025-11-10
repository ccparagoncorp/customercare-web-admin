import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient } from '@/lib/prisma'

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

export async function GET(request: NextRequest) {
  const prisma = createPrismaClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaClient = prisma as any
  
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
    
    // Scope-based parameters (preferred method)
    const brandId = searchParams.get('brandId')
    const categoryId = searchParams.get('categoryId')
    const subcategoryId = searchParams.get('subcategoryId')
    const knowledgeId = searchParams.get('knowledgeId')
    const sopId = searchParams.get('sopId')
    const qualityTrainingId = searchParams.get('qualityTrainingId')
    
    // Legacy parameters (for backward compatibility)
    const sourceTable = searchParams.get('sourceTable')
    const sourceKey = searchParams.get('sourceKey')

    // Build where clause based on scope
    // Using Record type since Prisma.TracerUpdateWhereInput may not be available if Prisma client isn't regenerated
    type TracerUpdateWhere = Record<string, unknown>
    let where: TracerUpdateWhere = {}

    // Scope-based queries (hierarchical)
    if (brandId) {
      // Brand scope: get all updates related to this brand
      // This includes: brand, all categories, all subcategories, all products, all detail products
      // First, get all related IDs
      const categories = await prismaClient.kategoriProduk.findMany({
        where: { brandId: brandId },
        select: { id: true }
      })
      const categoryIds = categories.map((c: { id: string }) => c.id)
      
      const subcategories = await prismaClient.subkategoriProduk.findMany({
        where: {
          kategoriProduk: {
            brandId: brandId
          }
        },
        select: { id: true }
      })
      const subcategoryIds = subcategories.map((s: { id: string }) => s.id)
      
      // Get all products related to this brand (via brandId, categoryId, or subcategoryId)
      const products = await prismaClient.produk.findMany({
        where: {
          OR: [
            { brandId: brandId },
            { categoryId: { in: categoryIds } },
            { subkategoriProdukId: { in: subcategoryIds } }
          ]
        },
        select: { id: true }
      })
      const productIds = products.map((p: { id: string }) => p.id)
      
      // Get all detail products for these products
      const detailProducts = await prismaClient.detailProduk.findMany({
        where: {
          produkId: { in: productIds }
        },
        select: { id: true }
      })
      const detailProductIds = detailProducts.map((d: { id: string }) => d.id)

      // Build OR condition for all related entities
      // Use sourceTable and sourceKey since brandId, categoryId, etc. may not exist in database yet
      const orConditions: Array<Record<string, unknown>> = []
      
      // Track brand by sourceTable
      orConditions.push({
        AND: [
          { sourceTable: 'brands' },
          { sourceKey: brandId }
        ]
      })
      
      // Track categories by sourceTable
      if (categoryIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'kategori_produks' },
            { sourceKey: { in: categoryIds } }
          ]
        })
      }
      
      // Track subcategories by sourceTable
      if (subcategoryIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'subkategori_produks' },
            { sourceKey: { in: subcategoryIds } }
          ]
        })
      }
      
      // Track products by sourceTable
      if (productIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'produks' },
            { sourceKey: { in: productIds } }
          ]
        })
      }
      
      // Track detail products by sourceTable
      if (detailProductIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'detail_produks' },
            { sourceKey: { in: detailProductIds } }
          ]
        })
      }

      where = { OR: orConditions }
    } else if (categoryId) {
      // Category scope: get all updates related to this category
      // This includes: category, all subcategories, all products, all detail products
      const subcategories = await prismaClient.subkategoriProduk.findMany({
        where: { kategoriProdukId: categoryId },
        select: { id: true }
      })
      const subcategoryIds = subcategories.map((s: { id: string }) => s.id)
      
      // Get all products related to this category (via categoryId or subcategoryId)
      const products = await prismaClient.produk.findMany({
        where: {
          OR: [
            { categoryId: categoryId },
            { subkategoriProdukId: { in: subcategoryIds } }
          ]
        },
        select: { id: true }
      })
      const productIds = products.map((p: { id: string }) => p.id)
      
      // Get all detail products for these products
      const detailProducts = await prismaClient.detailProduk.findMany({
        where: {
          produkId: { in: productIds }
        },
        select: { id: true }
      })
      const detailProductIds = detailProducts.map((d: { id: string }) => d.id)

      const orConditions: Array<Record<string, unknown>> = [
        // Track category by sourceTable
        {
          AND: [
            { sourceTable: 'kategori_produks' },
            { sourceKey: categoryId }
          ]
        }
      ]
      
      // Track subcategories by sourceTable
      if (subcategoryIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'subkategori_produks' },
            { sourceKey: { in: subcategoryIds } }
          ]
        })
      }
      
      // Track products by sourceTable
      if (productIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'produks' },
            { sourceKey: { in: productIds } }
          ]
        })
      }
      
      // Track detail products by sourceTable
      if (detailProductIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'detail_produks' },
            { sourceKey: { in: detailProductIds } }
          ]
        })
      }

      where = { OR: orConditions }
    } else if (subcategoryId) {
      // Subcategory scope: get all updates related to this subcategory
      // This includes: subcategory, all products, all detail products
      // Get all products related to this subcategory
      const products = await prismaClient.produk.findMany({
        where: { subkategoriProdukId: subcategoryId },
        select: { id: true }
      })
      const productIds = products.map((p: { id: string }) => p.id)
      
      // Get all detail products for these products
      const detailProducts = await prismaClient.detailProduk.findMany({
        where: {
          produkId: { in: productIds }
        },
        select: { id: true }
      })
      const detailProductIds = detailProducts.map((d: { id: string }) => d.id)

      const orConditions: Array<Record<string, unknown>> = [
        // Track subcategory by sourceTable
        {
          AND: [
            { sourceTable: 'subkategori_produks' },
            { sourceKey: subcategoryId }
          ]
        }
      ]
      
      // Track products by sourceTable
      if (productIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'produks' },
            { sourceKey: { in: productIds } }
          ]
        })
      }
      
      // Track detail products by sourceTable
      if (detailProductIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'detail_produks' },
            { sourceKey: { in: detailProductIds } }
          ]
        })
      }

      where = { OR: orConditions }
    } else if (knowledgeId) {
      // Knowledge scope: get all updates related to this knowledge
      // This includes: knowledge, all detail knowledges, all jenis detail knowledges, all produk jenis detail knowledges
      // First, get all related IDs
      const detailKnowledges = await prisma.detailKnowledge.findMany({
        where: { knowledgeId: knowledgeId },
        select: { id: true }
      })
      const detailKnowledgeIds = detailKnowledges.map(d => d.id)
      
      const jenisDetailKnowledges = await prisma.jenisDetailKnowledge.findMany({
        where: {
          detailKnowledge: {
            knowledgeId: knowledgeId
          }
        },
        select: { id: true }
      })
      const jenisDetailKnowledgeIds = jenisDetailKnowledges.map(j => j.id)
      
      const produkJenisDetailKnowledges = await prisma.produkJenisDetailKnowledge.findMany({
        where: {
          jenisDetailKnowledge: {
            detailKnowledge: {
              knowledgeId: knowledgeId
            }
          }
        },
        select: { id: true }
      })
      const produkJenisDetailKnowledgeIds = produkJenisDetailKnowledges.map(p => p.id)

      // Build OR condition: track by sourceTable/sourceKey for knowledge and nested entities
      const orConditions: Array<Record<string, unknown>> = [
        // Track knowledge by sourceTable
        {
          AND: [
            { sourceTable: 'knowledges' },
            { sourceKey: knowledgeId }
          ]
        }
      ]
      
      // Track detail knowledges by sourceTable
      if (detailKnowledgeIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'detail_knowledges' },
            { sourceKey: { in: detailKnowledgeIds } }
          ]
        })
      }
      
      // Track jenis detail knowledges by sourceTable
      if (jenisDetailKnowledgeIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'jenis_detail_knowledges' },
            { sourceKey: { in: jenisDetailKnowledgeIds } }
          ]
        })
      }
      
      // Track produk jenis detail knowledges by sourceTable
      if (produkJenisDetailKnowledgeIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'produk_jenis_detail_knowledges' },
            { sourceKey: { in: produkJenisDetailKnowledgeIds } }
          ]
        })
      }

      where = { OR: orConditions }
    } else if (sopId) {
      // SOP scope: get all updates related to this SOP
      // This includes: SOP, all jenis SOPs, all detail SOPs
      // First, get all related IDs
      const jenisSOPs = await prisma.jenisSOP.findMany({
        where: { sopId: sopId },
        select: { id: true }
      })
      const jenisSOPIds = jenisSOPs.map(j => j.id)
      
      const detailSOPs = await prisma.detailSOP.findMany({
        where: {
          jenisSOP: {
            sopId: sopId
          }
        },
        select: { id: true }
      })
      const detailSOPIds = detailSOPs.map(d => d.id)

      // Build OR condition: track by sourceTable/sourceKey for SOP and nested entities
      const orConditions: Array<Record<string, unknown>> = [
        // Track SOP by sourceTable
        {
          AND: [
            { sourceTable: 'sops' },
            { sourceKey: sopId }
          ]
        }
      ]
      
      // Track jenis SOPs by sourceTable
      if (jenisSOPIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'jenis_sops' },
            { sourceKey: { in: jenisSOPIds } }
          ]
        })
      }
      
      // Track detail SOPs by sourceTable
      if (detailSOPIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'detail_sops' },
            { sourceKey: { in: detailSOPIds } }
          ]
        })
      }

      where = { OR: orConditions }
    } else if (qualityTrainingId) {
      // QualityTraining scope: get all updates related to this quality training
      // This includes: quality training, all jenis quality trainings, all detail quality trainings, all subdetail quality trainings
      // First, get all related IDs
      const jenisQualityTrainings = await prisma.jenisQualityTraining.findMany({
        where: { qualityTrainingId: qualityTrainingId },
        select: { id: true }
      })
      const jenisQualityTrainingIds = jenisQualityTrainings.map(j => j.id)
      
      const detailQualityTrainings = await prisma.detailQualityTraining.findMany({
        where: {
          jenisQualityTraining: {
            qualityTrainingId: qualityTrainingId
          }
        },
        select: { id: true }
      })
      const detailQualityTrainingIds = detailQualityTrainings.map(d => d.id)
      
      const subdetailQualityTrainings = await prisma.subdetailQualityTraining.findMany({
        where: {
          detailQualityTraining: {
            jenisQualityTraining: {
              qualityTrainingId: qualityTrainingId
            }
          }
        },
        select: { id: true }
      })
      const subdetailQualityTrainingIds = subdetailQualityTrainings.map(s => s.id)

      // Build OR condition: track by sourceTable/sourceKey for quality training and nested entities
      const orConditions: Array<Record<string, unknown>> = [
        // Track quality training by sourceTable
        {
          AND: [
            { sourceTable: 'quality_trainings' },
            { sourceKey: qualityTrainingId }
          ]
        }
      ]
      
      // Track jenis quality trainings by sourceTable
      if (jenisQualityTrainingIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'jenis_quality_trainings' },
            { sourceKey: { in: jenisQualityTrainingIds } }
          ]
        })
      }
      
      // Track detail quality trainings by sourceTable
      if (detailQualityTrainingIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'detail_quality_trainings' },
            { sourceKey: { in: detailQualityTrainingIds } }
          ]
        })
      }
      
      // Track subdetail quality trainings by sourceTable
      if (subdetailQualityTrainingIds.length > 0) {
        orConditions.push({
          AND: [
            { sourceTable: 'subdetail_quality_trainings' },
            { sourceKey: { in: subdetailQualityTrainingIds } }
          ]
        })
      }

      where = { OR: orConditions }
    } else if (sourceTable) {
      // Legacy: use sourceTable and sourceKey
      where = { sourceTable: sourceTable }
      if (sourceKey) {
        where.sourceKey = sourceKey
      }
    } else {
      return NextResponse.json(
        { error: 'At least one scope parameter (brandId, categoryId, subcategoryId, knowledgeId, sopId, qualityTrainingId) or sourceTable is required' },
        { status: 400 }
      )
    }

    // Fetch tracer updates
    // Note: We only use sourceTable and sourceKey to avoid issues with fields that don't exist in database
    // Using type assertion with unknown first as recommended by TypeScript
    const tracerUpdates = await (prismaClient.tracerUpdate.findMany as unknown as (
      args: {
        where?: Record<string, unknown>
        orderBy?: { changedAt: 'asc' | 'desc' }
        select?: {
          id: boolean
          sourceTable: boolean
          sourceKey: boolean
          fieldName: boolean
          oldValue: boolean
          newValue: boolean
          actionType: boolean
          changedAt: boolean
          changedBy: boolean
        }
      }
    ) => Promise<Array<{
      id: string
      sourceTable: string
      sourceKey: string
      fieldName: string
      oldValue: string | null
      newValue: string | null
      actionType: string
      changedAt: Date | string
      changedBy: string | null
    }>>)({
      where: where,
      orderBy: {
        changedAt: 'desc',
      },
      select: {
        id: true,
        sourceTable: true,
        sourceKey: true,
        fieldName: true,
        oldValue: true,
        newValue: true,
        actionType: true,
        changedAt: true,
        changedBy: true,
        // Explicitly select only fields that exist in database
        // Do not select brandId, categoryId, etc. as they may not exist yet
      },
    })

    // Helper function to get related table information
    const getRelatedTableInfo = async (sourceTable: string, sourceKey: string): Promise<Array<{ tableName: string; fieldName: string; value: string }>> => {
      const relatedInfo: Array<{ tableName: string; fieldName: string; value: string }> = []
      
      try {
        const sourceTableStr = String(sourceTable)
        const sourceKeyStr = String(sourceKey)
        
        switch (sourceTableStr) {
          case 'detail_produks': {
            // Get product info
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const detailProduk = await (prismaClient.detailProduk.findUnique as any)({
              where: { id: sourceKeyStr },
              select: { 
                produk: {
                  select: {
                    id: true,
                    name: true,
                    subkategoriProduk: {
                      select: {
                        id: true,
                        name: true,
                        kategoriProduk: {
                          select: {
                            id: true,
                            name: true,
                            brand: {
                              select: {
                                id: true,
                                name: true
                              }
                            }
                          }
                        }
                      }
                    },
                    kategoriProduk: {
                      select: {
                        id: true,
                        name: true,
                        brand: {
                          select: {
                            id: true,
                            name: true
                          }
                        }
                      }
                    },
                    brand: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            })
            
            if (detailProduk?.produk) {
              relatedInfo.push({ tableName: 'Produk', fieldName: 'name', value: detailProduk.produk.name })
              
              if (detailProduk.produk.subkategoriProduk) {
                relatedInfo.push({ tableName: 'Subkategori Produk', fieldName: 'name', value: detailProduk.produk.subkategoriProduk.name })
                if (detailProduk.produk.subkategoriProduk.kategoriProduk) {
                  relatedInfo.push({ tableName: 'Kategori Produk', fieldName: 'name', value: detailProduk.produk.subkategoriProduk.kategoriProduk.name })
                  if (detailProduk.produk.subkategoriProduk.kategoriProduk.brand) {
                    relatedInfo.push({ tableName: 'Brand', fieldName: 'name', value: detailProduk.produk.subkategoriProduk.kategoriProduk.brand.name })
                  }
                }
              } else if (detailProduk.produk.kategoriProduk) {
                relatedInfo.push({ tableName: 'Kategori Produk', fieldName: 'name', value: detailProduk.produk.kategoriProduk.name })
                if (detailProduk.produk.kategoriProduk.brand) {
                  relatedInfo.push({ tableName: 'Brand', fieldName: 'name', value: detailProduk.produk.kategoriProduk.brand.name })
                }
              } else if (detailProduk.produk.brand) {
                relatedInfo.push({ tableName: 'Brand', fieldName: 'name', value: detailProduk.produk.brand.name })
              }
            }
            break
          }
          
          case 'produks': {
            // Get product's related info
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const produk = await (prismaClient.produk.findUnique as any)({
              where: { id: sourceKeyStr },
              select: {
                subkategoriProduk: {
                  select: {
                    id: true,
                    name: true,
                    kategoriProduk: {
                      select: {
                        id: true,
                        name: true,
                        brand: {
                          select: {
                            id: true,
                            name: true
                          }
                        }
                      }
                    }
                  }
                },
                kategoriProduk: {
                  select: {
                    id: true,
                    name: true,
                    brand: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                },
                brand: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            })
            
            if (produk) {
              if (produk.subkategoriProduk) {
                relatedInfo.push({ tableName: 'Subkategori Produk', fieldName: 'name', value: produk.subkategoriProduk.name })
                if (produk.subkategoriProduk.kategoriProduk) {
                  relatedInfo.push({ tableName: 'Kategori Produk', fieldName: 'name', value: produk.subkategoriProduk.kategoriProduk.name })
                  if (produk.subkategoriProduk.kategoriProduk.brand) {
                    relatedInfo.push({ tableName: 'Brand', fieldName: 'name', value: produk.subkategoriProduk.kategoriProduk.brand.name })
                  }
                }
              } else if (produk.kategoriProduk) {
                relatedInfo.push({ tableName: 'Kategori Produk', fieldName: 'name', value: produk.kategoriProduk.name })
                if (produk.kategoriProduk.brand) {
                  relatedInfo.push({ tableName: 'Brand', fieldName: 'name', value: produk.kategoriProduk.brand.name })
                }
              } else if (produk.brand) {
                relatedInfo.push({ tableName: 'Brand', fieldName: 'name', value: produk.brand.name })
              }
            }
            break
          }
          
          case 'subkategori_produks': {
            // Get subcategory's related info
            const subcategory = await prisma.subkategoriProduk.findUnique({
              where: { id: sourceKeyStr },
              select: {
                kategoriProduk: {
                  select: {
                    id: true,
                    name: true,
                    brand: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            })
            
            if (subcategory?.kategoriProduk) {
              relatedInfo.push({ tableName: 'Kategori Produk', fieldName: 'name', value: subcategory.kategoriProduk.name })
              if (subcategory.kategoriProduk.brand) {
                relatedInfo.push({ tableName: 'Brand', fieldName: 'name', value: subcategory.kategoriProduk.brand.name })
              }
            }
            break
          }
          
          case 'kategori_produks': {
            // Get category's related info
            const category = await prisma.kategoriProduk.findUnique({
              where: { id: sourceKeyStr },
              select: {
                brand: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            })
            
            if (category?.brand) {
              relatedInfo.push({ tableName: 'Brand', fieldName: 'name', value: category.brand.name })
            }
            break
          }
          
          case 'detail_sops': {
            // Get detail SOP's related info
            const detailSOP = await prisma.detailSOP.findUnique({
              where: { id: sourceKeyStr },
              select: {
                jenisSOP: {
                  select: {
                    id: true,
                    name: true,
                    sop: {
                      select: {
                        id: true,
                        name: true,
                        kategoriSOP: {
                          select: {
                            id: true,
                            name: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            })
            
            if (detailSOP?.jenisSOP) {
              relatedInfo.push({ tableName: 'Jenis SOP', fieldName: 'name', value: detailSOP.jenisSOP.name })
              if (detailSOP.jenisSOP.sop) {
                relatedInfo.push({ tableName: 'SOP', fieldName: 'name', value: detailSOP.jenisSOP.sop.name })
                if (detailSOP.jenisSOP.sop.kategoriSOP) {
                  relatedInfo.push({ tableName: 'Kategori SOP', fieldName: 'name', value: detailSOP.jenisSOP.sop.kategoriSOP.name })
                }
              }
            }
            break
          }
          
          case 'jenis_sops': {
            // Get jenis SOP's related info
            const jenisSOP = await prisma.jenisSOP.findUnique({
              where: { id: sourceKeyStr },
              select: {
                sop: {
                  select: {
                    id: true,
                    name: true,
                    kategoriSOP: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            })
            
            if (jenisSOP?.sop) {
              relatedInfo.push({ tableName: 'SOP', fieldName: 'name', value: jenisSOP.sop.name })
              if (jenisSOP.sop.kategoriSOP) {
                relatedInfo.push({ tableName: 'Kategori SOP', fieldName: 'name', value: jenisSOP.sop.kategoriSOP.name })
              }
            }
            break
          }
          
          case 'sops': {
            // Get SOP's related info
            // Prisma generates SOP model as sOP (lowercase s, uppercase OP)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prismaClient = prisma as any
            const sop = await prismaClient.sOP.findUnique({
              where: { id: sourceKeyStr },
              select: {
                kategoriSOP: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            })
            
            if (sop?.kategoriSOP) {
              relatedInfo.push({ tableName: 'Kategori SOP', fieldName: 'name', value: sop.kategoriSOP.name })
            }
            break
          }
          
          case 'subdetail_quality_trainings': {
            // Get subdetail quality training's related info
            const subdetail = await prisma.subdetailQualityTraining.findUnique({
              where: { id: sourceKeyStr },
              select: {
                detailQualityTraining: {
                  select: {
                    id: true,
                    name: true,
                    jenisQualityTraining: {
                      select: {
                        id: true,
                        name: true,
                        qualityTraining: {
                          select: {
                            id: true,
                            title: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            })
            
            if (subdetail?.detailQualityTraining) {
              relatedInfo.push({ tableName: 'Detail Quality Training', fieldName: 'name', value: subdetail.detailQualityTraining.name })
              if (subdetail.detailQualityTraining.jenisQualityTraining) {
                relatedInfo.push({ tableName: 'Jenis Quality Training', fieldName: 'name', value: subdetail.detailQualityTraining.jenisQualityTraining.name })
                if (subdetail.detailQualityTraining.jenisQualityTraining.qualityTraining) {
                  relatedInfo.push({ tableName: 'Quality Training', fieldName: 'title', value: subdetail.detailQualityTraining.jenisQualityTraining.qualityTraining.title })
                }
              }
            }
            break
          }
          
          case 'detail_quality_trainings': {
            // Get detail quality training's related info
            const detail = await prisma.detailQualityTraining.findUnique({
              where: { id: sourceKeyStr },
              select: {
                jenisQualityTraining: {
                  select: {
                    id: true,
                    name: true,
                    qualityTraining: {
                      select: {
                        id: true,
                        title: true
                      }
                    }
                  }
                }
              }
            })
            
            if (detail?.jenisQualityTraining) {
              relatedInfo.push({ tableName: 'Jenis Quality Training', fieldName: 'name', value: detail.jenisQualityTraining.name })
              if (detail.jenisQualityTraining.qualityTraining) {
                relatedInfo.push({ tableName: 'Quality Training', fieldName: 'title', value: detail.jenisQualityTraining.qualityTraining.title })
              }
            }
            break
          }
          
          case 'jenis_quality_trainings': {
            // Get jenis quality training's related info
            const jenis = await prisma.jenisQualityTraining.findUnique({
              where: { id: sourceKeyStr },
              select: {
                qualityTraining: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            })
            
            if (jenis?.qualityTraining) {
              relatedInfo.push({ tableName: 'Quality Training', fieldName: 'title', value: jenis.qualityTraining.title })
            }
            break
          }
          
          case 'produk_jenis_detail_knowledges': {
            // Get produk jenis detail knowledge's related info
            const produkJenis = await prisma.produkJenisDetailKnowledge.findUnique({
              where: { id: sourceKeyStr },
              select: {
                jenisDetailKnowledge: {
                  select: {
                    id: true,
                    name: true,
                    detailKnowledge: {
                      select: {
                        id: true,
                        name: true,
                        knowledge: {
                          select: {
                            id: true,
                            title: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            })
            
            if (produkJenis?.jenisDetailKnowledge) {
              relatedInfo.push({ tableName: 'Jenis Detail Knowledge', fieldName: 'name', value: produkJenis.jenisDetailKnowledge.name })
              if (produkJenis.jenisDetailKnowledge.detailKnowledge) {
                relatedInfo.push({ tableName: 'Detail Knowledge', fieldName: 'name', value: produkJenis.jenisDetailKnowledge.detailKnowledge.name })
                if (produkJenis.jenisDetailKnowledge.detailKnowledge.knowledge) {
                  relatedInfo.push({ tableName: 'Knowledge', fieldName: 'title', value: produkJenis.jenisDetailKnowledge.detailKnowledge.knowledge.title })
                }
              }
            }
            break
          }
          
          case 'jenis_detail_knowledges': {
            // Get jenis detail knowledge's related info
            const jenis = await prisma.jenisDetailKnowledge.findUnique({
              where: { id: sourceKeyStr },
              select: {
                detailKnowledge: {
                  select: {
                    id: true,
                    name: true,
                    knowledge: {
                      select: {
                        id: true,
                        title: true
                      }
                    }
                  }
                }
              }
            })
            
            if (jenis?.detailKnowledge) {
              relatedInfo.push({ tableName: 'Detail Knowledge', fieldName: 'name', value: jenis.detailKnowledge.name })
              if (jenis.detailKnowledge.knowledge) {
                relatedInfo.push({ tableName: 'Knowledge', fieldName: 'title', value: jenis.detailKnowledge.knowledge.title })
              }
            }
            break
          }
          
          case 'detail_knowledges': {
            // Get detail knowledge's related info
            const detail = await prisma.detailKnowledge.findUnique({
              where: { id: sourceKeyStr },
              select: {
                knowledge: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            })
            
            if (detail?.knowledge) {
              relatedInfo.push({ tableName: 'Knowledge', fieldName: 'title', value: detail.knowledge.title })
            }
            break
          }
        }
      } catch (err) {
        console.warn(`Could not get related table info for ${sourceTable}:${sourceKey}`, err)
      }
      
      return relatedInfo
    }

    // Enhance tracer updates with updateNotes from source tables
    // If fieldName is "updateNotes", we already have it in newValue/oldValue
    // If fieldName is "id", replace oldValue/newValue with record names
    // Otherwise, try to get current updateNotes from source table
    const enhancedUpdates = await Promise.all(
      tracerUpdates.map(async (update) => {
        try {
          const sourceKey = String(update.sourceKey)
          const sourceTable = String(update.sourceTable)
          let updateNotes: string | null = null
          let displayFieldName = String(update.fieldName)
          let displayOldValue: string | null = update.oldValue ? String(update.oldValue) : null
          let displayNewValue: string | null = update.newValue ? String(update.newValue) : null
          
          // Get related table information
          const relatedTableInfo = await getRelatedTableInfo(sourceTable, sourceKey)

          // Helper function to get record name based on table and ID
          const getRecordName = async (tableName: string, id: string): Promise<string | null> => {
            try {
              switch (tableName) {
                case 'brands': {
                  const brand = await prisma.brand.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return brand?.name || null
                }
                case 'kategori_produks': {
                  const category = await prisma.kategoriProduk.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return category?.name || null
                }
                case 'subkategori_produks': {
                  const subcategory = await prisma.subkategoriProduk.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return subcategory?.name || null
                }
                case 'produks': {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const product = await (prismaClient.produk.findUnique as any)({
                    where: { id },
                    select: { name: true },
                  })
                  return product?.name || null
                }
                case 'knowledges': {
                  const knowledge = await prisma.knowledge.findUnique({
                    where: { id },
                    select: { title: true },
                  })
                  return knowledge?.title || null
                }
                case 'sops': {
                  // Prisma generates SOP model as sOP (lowercase s, uppercase OP)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const prismaClient = prisma as any
                  const sop = await prismaClient.sOP.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return sop?.name || null
                }
                case 'jenis_sops': {
                  const jenisSOP = await prisma.jenisSOP.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return jenisSOP?.name || null
                }
                case 'kategori_sops': {
                  const kategoriSOP = await prisma.kategoriSOP.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return kategoriSOP?.name || null
                }
                case 'quality_trainings': {
                  const qualityTraining = await prisma.qualityTraining.findUnique({
                    where: { id },
                    select: { title: true },
                  })
                  return qualityTraining?.title || null
                }
                case 'jenis_quality_trainings': {
                  const jenisQualityTraining = await prisma.jenisQualityTraining.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return jenisQualityTraining?.name || null
                }
                case 'detail_quality_trainings': {
                  const detailQualityTraining = await prisma.detailQualityTraining.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return detailQualityTraining?.name || null
                }
                case 'subdetail_quality_trainings': {
                  const subdetailQualityTraining = await prisma.subdetailQualityTraining.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return subdetailQualityTraining?.name || null
                }
                case 'detail_knowledges': {
                  const detailKnowledge = await prisma.detailKnowledge.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return detailKnowledge?.name || null
                }
                case 'jenis_detail_knowledges': {
                  const jenisDetailKnowledge = await prisma.jenisDetailKnowledge.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return jenisDetailKnowledge?.name || null
                }
                case 'produk_jenis_detail_knowledges': {
                  const produkJenisDetailKnowledge = await prisma.produkJenisDetailKnowledge.findUnique({
                    where: { id },
                    select: { name: true },
                  })
                  return produkJenisDetailKnowledge?.name || null
                }
                case 'detail_produks': {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const detailProduk = await (prismaClient.detailProduk.findUnique as any)({
                    where: { id },
                    select: { name: true },
                  })
                  return detailProduk?.name || null
                }
                default:
                  return null
              }
            } catch (err) {
              console.warn(`Could not get record name for ${tableName}:${id}`, err)
              return null
            }
          }

          // If fieldName is "id" or ends with "Id" (foreign key), replace ID values with record names
          const fieldName = String(update.fieldName)
          const fieldNameLower = fieldName.toLowerCase()
          if (fieldNameLower === 'id' || fieldNameLower.endsWith('id')) {
            // Determine which table to query based on fieldName
            let targetTable = update.sourceTable
            
            // Map field names to their corresponding table names
            if (fieldNameLower === 'brandid') {
              targetTable = 'brands'
            } else if (fieldNameLower === 'categoryid' || fieldNameLower === 'kategoriprodukid') {
              targetTable = 'kategori_produks'
            } else if (fieldNameLower === 'subcategoryid' || fieldNameLower === 'subkategoriprodukid') {
              targetTable = 'subkategori_produks'
            } else if (fieldNameLower === 'productid' || fieldNameLower === 'produkid') {
              targetTable = 'produks'
            } else if (fieldNameLower === 'knowledgeid') {
              targetTable = 'knowledges'
            } else if (fieldNameLower === 'sopid') {
              targetTable = 'sops'
            } else if (fieldNameLower === 'kategorisopid') {
              targetTable = 'kategori_sops'
            } else if (fieldNameLower === 'jenisopid' || fieldNameLower === 'jenissopid') {
              targetTable = 'jenis_sops'
            } else if (fieldNameLower === 'qualitytrainingid') {
              targetTable = 'quality_trainings'
            } else if (fieldNameLower === 'jenisqualitytrainingid') {
              targetTable = 'jenis_quality_trainings'
            } else if (fieldNameLower === 'detailqualitytrainingid') {
              targetTable = 'detail_quality_trainings'
            } else if (fieldNameLower === 'subdetailqualitytrainingid') {
              targetTable = 'subdetail_quality_trainings'
            } else if (fieldNameLower === 'detailknowledgeid') {
              targetTable = 'detail_knowledges'
            } else if (fieldNameLower === 'jenisdetailknowledgeid') {
              targetTable = 'jenis_detail_knowledges'
            } else if (fieldNameLower === 'produkjenisdetailknowledgeid') {
              targetTable = 'produk_jenis_detail_knowledges'
            } else if (fieldNameLower === 'detailprodukid') {
              targetTable = 'detail_produks'
            }
            
            // Change field name display (remove "Id" suffix and capitalize)
            if (fieldNameLower === 'id') {
              displayFieldName = 'Name'
            } else {
              // Convert "brandId" to "Brand", "categoryId" to "Category", etc.
              displayFieldName = fieldName.replace(/[iI]d$/, '').replace(/([A-Z])/g, ' $1').trim()
              if (!displayFieldName) {
                displayFieldName = fieldName
              }
            }
            
            // Get names for old and new values using the target table
            if (update.oldValue) {
              const oldValueStr = String(update.oldValue)
              const oldName = await getRecordName(targetTable, oldValueStr)
              displayOldValue = oldName || oldValueStr
            }
            if (update.newValue) {
              const newValueStr = String(update.newValue)
              const newName = await getRecordName(targetTable, newValueStr)
              displayNewValue = newName || newValueStr
            }
          }

          // Get updateNotes from source table
          const sourceTableStr = String(update.sourceTable)
          const sourceKeyStr = String(sourceKey)
          
          switch (sourceTableStr) {
            case 'brands': {
              const brand = await prisma.brand.findUnique({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = brand?.updateNotes || null
              break
            }
            case 'kategori_produks': {
              const category = await prisma.kategoriProduk.findUnique({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = category?.updateNotes || null
              break
            }
            case 'subkategori_produks': {
              const subcategory = await prisma.subkategoriProduk.findUnique({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = subcategory?.updateNotes || null
              break
            }
            case 'produks': {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const product = await (prismaClient.produk.findUnique as any)({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = product?.updateNotes || null
              break
            }
            case 'knowledges': {
              const knowledge = await prisma.knowledge.findUnique({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = knowledge?.updateNotes || null
              break
            }
            case 'sops': {
              // SOP doesn't have updateNotes field
              break
            }
            case 'jenis_sops': {
              const jenisSOP = await prisma.jenisSOP.findUnique({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = jenisSOP?.updateNotes || null
              break
            }
            case 'quality_trainings': {
              const qualityTraining = await prisma.qualityTraining.findUnique({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = qualityTraining?.updateNotes || null
              break
            }
            case 'jenis_quality_trainings': {
              const jenisQualityTraining = await prisma.jenisQualityTraining.findUnique({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = jenisQualityTraining?.updateNotes || null
              break
            }
            case 'detail_quality_trainings': {
              const detailQualityTraining = await prisma.detailQualityTraining.findUnique({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = detailQualityTraining?.updateNotes || null
              break
            }
            case 'subdetail_quality_trainings': {
              const subdetailQualityTraining = await prisma.subdetailQualityTraining.findUnique({
                where: { id: sourceKeyStr },
                select: { updateNotes: true },
              })
              updateNotes = subdetailQualityTraining?.updateNotes || null
              break
            }
          }

          // If this update is about updateNotes field, use the newValue as updateNotes
          if (fieldName === 'updateNotes' && update.newValue) {
            updateNotes = String(update.newValue)
          }

          // Get changedBy name (from User or Agent table)
          let changedByName: string | null = null
          if (update.changedBy) {
            try {
              const changedById = String(update.changedBy)
              
              // Try to find in User table first
              const user = await prisma.user.findUnique({
                where: { id: changedById },
                select: { name: true },
              })
              
              if (user) {
                changedByName = user.name
              } else {
                // If not found in User, try Agent table
                const agent = await prisma.agent.findUnique({
                  where: { id: changedById },
                  select: { name: true },
                })
                
                if (agent) {
                  changedByName = agent.name
                } else {
                  // If not found in both, keep the original ID
                  changedByName = changedById
                }
              }
            } catch (err) {
              console.warn(`Could not get changedBy name for ${update.changedBy}`, err)
              changedByName = String(update.changedBy)
            }
          }

          return {
            ...update,
            fieldName: displayFieldName,
            oldValue: displayOldValue,
            newValue: displayNewValue,
            updateNotes: updateNotes || null,
            relatedTableInfo: relatedTableInfo,
            changedBy: changedByName,
          }
        } catch (err) {
          // If we can't enhance the update, just return it as is
          console.warn(`Could not enhance update for ${update.sourceTable}:${update.sourceKey}`, err)
          return update
        }
      })
    )

    return NextResponse.json(enhancedUpdates)
  } catch (error) {
    // Check if it's a database connectivity issue or column doesn't exist
    const errorObj = error as { message?: string; name?: string }
    const errorMessage = errorObj?.message || ''
    const isDbConnectivityIssue = 
      errorMessage.includes("Can't reach database server") ||
      errorMessage.includes('Invalid `prisma') ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('column') ||
      errorObj?.name?.includes('Prisma') ||
      errorObj?.name === 'PrismaClientInitializationError'

    if (isDbConnectivityIssue || !process.env.DATABASE_URL) {
      // Return empty array with 503 status when DB is unreachable or column doesn't exist
      // This allows the UI to still render gracefully
      console.warn('Database issue (connectivity or missing column), returning empty tracer updates:', errorMessage)
      return NextResponse.json([], { status: 503 })
    }

    console.error('Error fetching tracer updates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracer updates' },
      { status: 500 }
    )
  } finally {
    // Always disconnect Prisma client
    try {
      await prisma.$disconnect()
    } catch (disconnectError) {
      // Ignore disconnect errors
      console.warn('Error disconnecting Prisma client:', disconnectError)
    }
  }
}
