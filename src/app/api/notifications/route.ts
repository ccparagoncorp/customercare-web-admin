import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient } from '@/lib/prisma'
import { normalizeEmptyStrings } from '@/lib/utils/normalize'

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
    const limit = parseInt(searchParams.get('limit') || '50')

    // Fetch recent tracer updates as notifications (only the ones we're showing)
    // Using type assertion because Prisma client may not be regenerated
    const tracerUpdates = await (prismaClient.tracerUpdate.findMany as unknown as (
      args: {
        where?: Record<string, unknown>
        orderBy?: { changedAt: 'desc' }
        take?: number
        select?: {
          id: boolean
          sourceTable: boolean
          sourceKey: boolean
          fieldName: boolean
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
      actionType: string
      changedAt: Date | string
      changedBy: string | null
    }>>)({
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        sourceTable: true,
        sourceKey: true,
        fieldName: true,
        actionType: true,
        changedAt: true,
        changedBy: true,
      },
    })

    // Get changedBy names
    const notifications = await Promise.all(
      tracerUpdates.map(async (update) => {
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
                changedByName = changedById
              }
            }
          } catch (err) {
            console.warn(`Could not get changedBy name for ${update.changedBy}`, err)
            changedByName = String(update.changedBy)
          }
        }

        // Format table name for display
        const formatTableName = (tableName: string) => {
          return tableName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }

        // Get record name and parent info for link generation
        let recordName: string | null = null
        let parentInfo: { brandName?: string; categoryName?: string; subcategoryName?: string; kategoriSOP?: string } | null = null
        try {
          const sourceTableStr = String(update.sourceTable)
          const sourceKeyStr = String(update.sourceKey)
          
          switch (sourceTableStr) {
            case 'brands': {
              const brand = await prisma.brand.findUnique({
                where: { id: sourceKeyStr },
                select: { name: true },
              })
              recordName = brand?.name || null
              break
            }
            case 'kategori_produks': {
              const category = await prisma.kategoriProduk.findUnique({
                where: { id: sourceKeyStr },
                select: { 
                  name: true,
                  brand: {
                    select: { name: true }
                  }
                },
              })
              recordName = category?.name || null
              if (category?.brand) {
                parentInfo = { brandName: category.brand.name }
              }
              break
            }
            case 'subkategori_produks': {
              const subcategory = await prisma.subkategoriProduk.findUnique({
                where: { id: sourceKeyStr },
                select: { 
                  name: true,
                  kategoriProduk: {
                    select: {
                      name: true,
                      brand: {
                        select: { name: true }
                      }
                    }
                  }
                },
              })
              recordName = subcategory?.name || null
              if (subcategory?.kategoriProduk) {
                parentInfo = {
                  categoryName: subcategory.kategoriProduk.name,
                  brandName: subcategory.kategoriProduk.brand?.name
                }
              }
              break
            }
            case 'produks': {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const product = await (prismaClient.produk.findUnique as any)({
                where: { id: sourceKeyStr },
                select: { 
                  name: true,
                  brand: {
                    select: { name: true }
                  },
                  kategoriProduk: {
                    select: {
                      name: true,
                      brand: {
                        select: { name: true }
                      }
                    }
                  },
                  subkategoriProduk: {
                    select: {
                      name: true,
                      kategoriProduk: {
                        select: {
                          name: true,
                          brand: {
                            select: { name: true }
                          }
                        }
                      }
                    }
                  }
                },
              })
              recordName = product?.name || null
              if (product) {
                if (product.subkategoriProduk) {
                  parentInfo = {
                    subcategoryName: product.subkategoriProduk.name,
                    categoryName: product.subkategoriProduk.kategoriProduk?.name,
                    brandName: product.subkategoriProduk.kategoriProduk?.brand?.name
                  }
                } else if (product.kategoriProduk) {
                  parentInfo = {
                    categoryName: product.kategoriProduk.name,
                    brandName: product.kategoriProduk.brand?.name
                  }
                } else if (product.brand) {
                  parentInfo = {
                    brandName: product.brand.name
                  }
                }
              }
              break
            }
            case 'detail_produks': {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const detailProduk = await (prismaClient.detailProduk.findUnique as any)({
                where: { id: sourceKeyStr },
                select: {
                  produk: {
                    select: {
                      name: true,
                      brand: {
                        select: { name: true }
                      },
                      kategoriProduk: {
                        select: {
                          name: true,
                          brand: {
                            select: { name: true }
                          }
                        }
                      },
                      subkategoriProduk: {
                        select: {
                          name: true,
                          kategoriProduk: {
                            select: {
                              name: true,
                              brand: {
                                select: { name: true }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
              })
              recordName = detailProduk?.produk?.name || null
              if (detailProduk?.produk) {
                const prod = detailProduk.produk
                if (prod.subkategoriProduk) {
                  parentInfo = {
                    subcategoryName: prod.subkategoriProduk.name,
                    categoryName: prod.subkategoriProduk.kategoriProduk?.name,
                    brandName: prod.subkategoriProduk.kategoriProduk?.brand?.name
                  }
                } else if (prod.kategoriProduk) {
                  parentInfo = {
                    categoryName: prod.kategoriProduk.name,
                    brandName: prod.kategoriProduk.brand?.name
                  }
                } else if (prod.brand) {
                  parentInfo = {
                    brandName: prod.brand.name
                  }
                }
              }
              break
            }
            case 'knowledges': {
              const knowledge = await prisma.knowledge.findUnique({
                where: { id: sourceKeyStr },
                select: { title: true },
              })
              recordName = knowledge?.title || null
              break
            }
            case 'sops': {
              // Prisma generates SOP model as sOP
              const sop = await prismaClient.sOP.findUnique({
                where: { id: sourceKeyStr },
                select: { 
                  name: true,
                  kategoriSOP: {
                    select: { name: true }
                  }
                },
              })
              recordName = sop?.name || null
              if (sop?.kategoriSOP) {
                parentInfo = { kategoriSOP: sop.kategoriSOP.name }
              }
              break
            }
            case 'kategori_sops': {
              const kategoriSOP = await prisma.kategoriSOP.findUnique({
                where: { id: sourceKeyStr },
                select: { name: true },
              })
              recordName = kategoriSOP?.name || null
              break
            }
            case 'jenis_sops': {
              const jenisSOP = await prisma.jenisSOP.findUnique({
                where: { id: sourceKeyStr },
                select: { 
                  name: true,
                  sop: {
                    select: {
                      name: true,
                      kategoriSOP: {
                        select: { name: true }
                      }
                    }
                  }
                },
              })
              recordName = jenisSOP?.name || null
              if (jenisSOP?.sop?.kategoriSOP) {
                parentInfo = { kategoriSOP: jenisSOP.sop.kategoriSOP.name }
              }
              break
            }
            case 'detail_sops': {
              const detailSOP = await prisma.detailSOP.findUnique({
                where: { id: sourceKeyStr },
                select: {
                  jenisSOP: {
                    select: {
                      name: true,
                      sop: {
                        select: {
                          name: true,
                          kategoriSOP: {
                            select: { name: true }
                          }
                        }
                      }
                    }
                  }
                },
              })
              recordName = detailSOP?.jenisSOP?.name || null
              if (detailSOP?.jenisSOP?.sop?.kategoriSOP) {
                parentInfo = { kategoriSOP: detailSOP.jenisSOP.sop.kategoriSOP.name }
              }
              break
            }
          }
        } catch (err) {
          console.warn(`Could not get record name for ${update.sourceTable}:${update.sourceKey}`, err)
        }

        return {
          id: update.id,
          type: update.actionType,
          title: `${formatTableName(update.sourceTable)} - ${update.fieldName}`,
          message: `${update.actionType} operation on ${formatTableName(update.sourceTable)}`,
          sourceTable: update.sourceTable,
          sourceKey: update.sourceKey,
          recordName: recordName, // Add record name for link generation
          parentInfo: parentInfo, // Add parent info for link generation
          fieldName: update.fieldName,
          changedBy: changedByName,
          changedAt: update.changedAt instanceof Date ? update.changedAt.toISOString() : String(update.changedAt),
          // For now, all notifications are considered unread
          // In production, you'd track this in a separate table
          isRead: false,
        }
      })
    )

    // Unread count is the number of notifications we fetched (the recent ones)
    // Client will filter based on localStorage to get actual unread count
    return NextResponse.json({
      notifications,
      unreadCount: notifications.length, // Count of notifications we're showing
      totalCount: notifications.length,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications', notifications: [], unreadCount: 0, totalCount: 0 },
      { status: 500 }
    )
  } finally {
    // Don't disconnect - let Prisma connection pool manage connections for better performance
  }
}

// Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationIds } = normalizeEmptyStrings(await request.json()) as {
      notificationIds?: unknown
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds array is required' },
        { status: 400 }
      )
    }

    // In a real system, you'd update a read status in a notifications table
    // For now, we'll just return success since we're using TracerUpdate directly
    // This endpoint exists for future implementation with a proper notifications table

    return NextResponse.json({ 
      success: true,
      message: 'Notifications marked as read',
      markedCount: notificationIds.length,
    })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  } finally {
    // Don't disconnect - let Prisma connection pool manage connections for better performance
  }
}
