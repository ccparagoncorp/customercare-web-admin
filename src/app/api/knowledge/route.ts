import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import { uploadFileServer, deleteFileServer, deleteFilesServer } from '@/lib/supabase-storage'

// GET /api/knowledge - Get all knowledge with search and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !(session as any).user || ((session as any).user as any).role !== 'SUPER_ADMIN' && ((session as any).user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    // Build where clause with optimized search
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { startsWith: search, mode: 'insensitive' } },
        { description: { startsWith: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get knowledge with pagination using per-request Prisma client
    const [knowledge, total] = await withRetry(async () => {
      const prisma = createPrismaClient()
      try {
        return await Promise.all([
          prisma.knowledge.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              description: true,
              logos: true,
              createdAt: true,
              updatedAt: true,
              createdBy: true,
              updatedBy: true,
              detailKnowledges: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logos: true,
                  jenisDetailKnowledges: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      logos: true,
                      produkJenisDetailKnowledges: {
                        select: {
                          id: true,
                          name: true,
                          description: true,
                          logos: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }),
          prisma.knowledge.count({ where })
        ])
      } finally {
        await prisma.$disconnect()
      }
    })

    // Return knowledge
    return NextResponse.json({
      knowledge,
      pagination: {
        page,
        limit,
        total: Number(total),
        pages: Math.ceil(Number(total) / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching knowledge:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/knowledge - Create new knowledge
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !(session as any).user || ((session as any).user as any).role !== 'SUPER_ADMIN' && ((session as any).user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const createdBy = (formData.get('createdBy') as string) || null
    const logoFile = formData.get('logo') as File
    const details = JSON.parse(formData.get('details') as string || '[]') as Array<{ 
      index: number; 
      name: string; 
      description: string;
      jenisDetails: Array<{
        name: string;
        description: string;
        produkJenisDetails: Array<{
          name: string;
          description: string;
        }>;
      }>;
    }>

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { message: 'Title and description are required' },
        { status: 400 }
      )
    }

    let logoUrl = null

    // Upload logo if provided
    const knowledgeLogos: string[] = []
    if (logoFile && logoFile.size > 0) {
      const uploadResult = await uploadFileServer(logoFile, 'knowledge')
      if (uploadResult.error || !uploadResult.url) {
        return NextResponse.json({ message: 'Failed to upload logo' }, { status: 500 })
      }
      logoUrl = uploadResult.url
      knowledgeLogos.push(uploadResult.url)
    }
    // accept multiple logos: logo_0, logo_1, ...
    let k = 0
    while (true) {
      const f = formData.get(`logo_${k}`) as File | null
      if (!f) break
      if (f.size > 0) {
        const up = await uploadFileServer(f, 'knowledge')
        if (up.error) return NextResponse.json({ message: 'Failed to upload logo' }, { status: 500 })
        knowledgeLogos.push(up.url as string)
      }
      k++
    }

    // Resolve detail logo uploads (if any index has an accompanying file)
    const resolvedDetails = [] as Array<{ 
      name: string; 
      description: string; 
      logos: string[];
      jenisDetails: Array<{
        name: string;
        description: string;
        logos: string[];
        produkJenisDetails: Array<{
          name: string;
          description: string;
          logos: string[];
        }>;
      }>;
    }>
    
    for (const d of details) {
      const file = formData.get(`detailLogo_${d.index}`) as File | null
      const logos: string[] = []
      if (file && file.size > 0) {
        const up = await uploadFileServer(file, 'knowledge/detail')
        if (up.error) {
          return NextResponse.json({ message: 'Failed to upload detail logo' }, { status: 500 })
        }
        logos.push(up.url as string)
      }
      // multiple detail logos: detailLogo_{index}_{j}
      let j = 0
      while (true) {
        const ff = formData.get(`detailLogo_${d.index}_${j}`) as File | null
        if (!ff) break
        if (ff.size > 0) {
          const up2 = await uploadFileServer(ff, 'knowledge/detail')
          if (up2.error) return NextResponse.json({ message: 'Failed to upload detail logo' }, { status: 500 })
          logos.push(up2.url as string)
        }
        j++
      }

      // Handle jenis details
      const resolvedJenisDetails = []
      for (let jenisIdx = 0; jenisIdx < d.jenisDetails.length; jenisIdx++) {
        const jenis = d.jenisDetails[jenisIdx]
        const jenisFile = formData.get(`jenisLogo_${d.index}_${jenisIdx}`) as File | null
        const jenisLogos: string[] = []
        
        if (jenisFile && jenisFile.size > 0) {
          const up = await uploadFileServer(jenisFile, 'knowledge/jenis')
          if (up.error) {
            return NextResponse.json({ message: 'Failed to upload jenis logo' }, { status: 500 })
          }
          jenisLogos.push(up.url as string)
        }
        
        // multiple jenis logos: jenisLogo_{index}_{jenisIdx}_{k}
        let k = 0
        while (true) {
          const ff = formData.get(`jenisLogo_${d.index}_${jenisIdx}_${k}`) as File | null
          if (!ff) break
          if (ff.size > 0) {
            const up2 = await uploadFileServer(ff, 'knowledge/jenis')
            if (up2.error) return NextResponse.json({ message: 'Failed to upload jenis logo' }, { status: 500 })
            jenisLogos.push(up2.url as string)
          }
          k++
        }

        // Handle produk jenis details
        const resolvedProdukDetails = []
        for (let produkIdx = 0; produkIdx < jenis.produkJenisDetails.length; produkIdx++) {
          const produk = jenis.produkJenisDetails[produkIdx]
          const produkFile = formData.get(`produkLogo_${d.index}_${jenisIdx}_${produkIdx}`) as File | null
          const produkLogos: string[] = []
          
          if (produkFile && produkFile.size > 0) {
            const up = await uploadFileServer(produkFile, 'knowledge/produk')
            if (up.error) {
              return NextResponse.json({ message: 'Failed to upload produk logo' }, { status: 500 })
            }
            produkLogos.push(up.url as string)
          }
          
          // multiple produk logos: produkLogo_{index}_{jenisIdx}_{produkIdx}_{l}
          let l = 0
          while (true) {
            const ff = formData.get(`produkLogo_${d.index}_${jenisIdx}_${produkIdx}_${l}`) as File | null
            if (!ff) break
            if (ff.size > 0) {
              const up2 = await uploadFileServer(ff, 'knowledge/produk')
              if (up2.error) return NextResponse.json({ message: 'Failed to upload produk logo' }, { status: 500 })
              produkLogos.push(up2.url as string)
            }
            l++
          }

          resolvedProdukDetails.push({
            name: produk.name.trim(),
            description: produk.description || '',
            logos: produkLogos
          })
        }

        resolvedJenisDetails.push({
          name: jenis.name.trim(),
          description: jenis.description || '',
          logos: jenisLogos,
          produkJenisDetails: resolvedProdukDetails
        })
      }

      resolvedDetails.push({ 
        name: d.name, 
        description: d.description,
        logos,
        jenisDetails: resolvedJenisDetails
      })
    }

    // Create knowledge with details using per-request Prisma client
    const newKnowledge = await withRetry(async () => {
      const prisma = createPrismaClient()
      try {
        return await prisma.knowledge.create({
          data: {
            title: title.trim(),
            description: description,
            logos: knowledgeLogos,
            createdBy: createdBy,
            detailKnowledges: {
              create: resolvedDetails.map((detail) => ({
                name: detail.name.trim(),
                description: detail.description || '',
                logos: detail.logos,
                jenisDetailKnowledges: {
                  create: detail.jenisDetails.map((jenis) => ({
                    name: jenis.name.trim(),
                    description: jenis.description || '',
                    logos: jenis.logos,
                    produkJenisDetailKnowledges: {
                      create: jenis.produkJenisDetails.map((produk) => ({
                        name: produk.name.trim(),
                        description: produk.description || '',
                        logos: produk.logos
                      }))
                    }
                  }))
                }
              }))
            }
          },
          select: {
            id: true,
            title: true,
            description: true,
            logos: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            updatedBy: true,
            detailKnowledges: {
              select: {
                id: true,
                name: true,
                description: true,
                logos: true,
                jenisDetailKnowledges: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logos: true,
                    produkJenisDetailKnowledges: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        logos: true
                      }
                    }
                  }
                }
              }
            }
          }
        })
      } finally {
        await prisma.$disconnect()
      }
    })

    return NextResponse.json(
      {
        message: 'Knowledge created successfully',
        knowledge: newKnowledge
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating knowledge:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/knowledge - Delete knowledge
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user || ((session as any).user as any).role !== 'SUPER_ADMIN' && ((session as any).user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const knowledgeId = searchParams.get('id')

    if (!knowledgeId) {
      return NextResponse.json(
        { message: 'Knowledge ID is required' },
        { status: 400 }
      )
    }

    // Check if knowledge exists
    const existingKnowledge = await withRetry(async () => {
      const prisma = createPrismaClient()
      try {
        return await prisma.knowledge.findUnique({
          where: { id: knowledgeId },
          select: {
            id: true,
            logos: true,
            detailKnowledges: {
              select: {
                logos: true,
                jenisDetailKnowledges: {
                  select: {
                    logos: true,
                    produkJenisDetailKnowledges: {
                      select: { logos: true }
                    }
                  }
                }
              }
            }
          }
        })
      } finally {
        await prisma.$disconnect()
      }
    })

    if (!existingKnowledge) {
      return NextResponse.json(
        { message: 'Knowledge not found' },
        { status: 404 }
      )
    }

    // Collect all logo URLs across all levels and delete in one batch
    const urlsToDelete: string[] = []
    if (existingKnowledge.logos?.length) urlsToDelete.push(...existingKnowledge.logos)
    for (const d of existingKnowledge.detailKnowledges) {
      if (d.logos?.length) urlsToDelete.push(...d.logos)
      const jenisList = (d as any).jenisDetailKnowledges || []
      for (const j of jenisList) {
        if (j.logos?.length) urlsToDelete.push(...j.logos)
        const produkList = j.produkJenisDetailKnowledges || []
        for (const p of produkList) {
          if (p.logos?.length) urlsToDelete.push(...p.logos)
        }
      }
    }
    if (urlsToDelete.length > 0) {
      await deleteFilesServer(urlsToDelete)
    }

    // Delete knowledge (cascades detailKnowledges via relation)
    await withRetry(async () => {
      const prisma = createPrismaClient()
      try {
        return await prisma.knowledge.delete({ where: { id: knowledgeId } })
      } finally {
        await prisma.$disconnect()
      }
    })

    return NextResponse.json(
      { message: 'Knowledge deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting knowledge:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/knowledge - Update knowledge
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user || ((session as any).user as any).role !== 'SUPER_ADMIN' && ((session as any).user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const id = formData.get('id') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const updatedBy = (formData.get('updatedBy') as string) || null
    const updateNotes = (formData.get('updateNotes') as string) || null
    const logoFile = formData.get('logo') as File | null
    const detailsRaw = formData.get('details') as string | null
    const removedLogos = JSON.parse(formData.get('removedLogos') as string || '[]') as string[]
    const removedDetailLogos = JSON.parse(formData.get('removedDetailLogos') as string || '[]') as Array<{ detailId: string, logos: string[] }>
    const removedJenisLogos = JSON.parse(formData.get('removedJenisLogos') as string || '[]') as Array<{ jenisId: string, logos: string[] }>
    const removedProdukLogos = JSON.parse(formData.get('removedProdukLogos') as string || '[]') as Array<{ produkId: string, logos: string[] }>

    if (!id) {
      return NextResponse.json({ message: 'Knowledge ID is required' }, { status: 400 })
    }

    const existing = await withRetry(async () => {
      const prisma = createPrismaClient()
      try {
        return await prisma.knowledge.findUnique({ where: { id } })
      } finally {
        await prisma.$disconnect()
      }
    })
    if (!existing) {
      return NextResponse.json({ message: 'Knowledge not found' }, { status: 404 })
    }

    // Delete removed logos from storage
    for (const logoUrl of removedLogos) {
      await deleteFileServer(logoUrl)
    }
    
    for (const { logos } of removedDetailLogos) {
      for (const logoUrl of logos) {
        await deleteFileServer(logoUrl)
      }
    }
    
    for (const { logos } of removedJenisLogos) {
      for (const logoUrl of logos) {
        await deleteFileServer(logoUrl)
      }
    }
    
    for (const { logos } of removedProdukLogos) {
      for (const logoUrl of logos) {
        await deleteFileServer(logoUrl)
      }
    }

    let logoUrl: string | null | undefined = undefined
    const logosToSet: string[] = []
    if (logoFile && logoFile.size > 0) {
      const uploadResult = await uploadFileServer(logoFile, 'knowledge')
      if (uploadResult.error || !uploadResult.url) return NextResponse.json({ message: 'Failed to upload logo' }, { status: 500 })
      logoUrl = uploadResult.url
      logosToSet.push(uploadResult.url)
    }
    // multiple knowledge logos during edit
    let gi = 0
    while (true) {
      const g = formData.get(`logo_${gi}`) as File | null
      if (!g) break
      if (g.size > 0) {
        const up = await uploadFileServer(g, 'knowledge')
        if (up.error) return NextResponse.json({ message: 'Failed to upload logo' }, { status: 500 })
        logosToSet.push(up.url as string)
      }
      gi++
    }

    // If details provided, rebuild detailKnowledges (replace all)
    if (detailsRaw) {
      const parsed = JSON.parse(detailsRaw) as Array<{ 
        index: number; 
        name: string; 
        description: string; 
        existingLogoUrl?: string | null;
        jenisDetails: Array<{
          name: string;
          description: string;
          existingLogoUrl?: string | null;
          produkJenisDetails: Array<{
            name: string;
            description: string;
            existingLogoUrl?: string | null;
          }>;
        }>;
      }>
      const resolved: Array<{ 
        name: string; 
        description: string; 
        logos: string[];
        jenisDetails: Array<{
          name: string;
          description: string;
          logos: string[];
          produkJenisDetails: Array<{
            name: string;
            description: string;
            logos: string[];
          }>;
        }>;
      }> = []
      
      for (const d of parsed) {
        const file = formData.get(`detailLogo_${d.index}`) as File | null
        const logos: string[] = []
        
        if (file && file.size > 0) {
          const up = await uploadFileServer(file, 'knowledge/detail')
          if (up.error) {
            return NextResponse.json({ message: 'Failed to upload detail logo' }, { status: 500 })
          }
          logos.push(up.url as string)
        }
        
        // Handle multiple detail logos: detailLogo_{index}_{j}
        let j = 0
        while (true) {
          const ff = formData.get(`detailLogo_${d.index}_${j}`) as File | null
          if (!ff) break
          if (ff.size > 0) {
            const up2 = await uploadFileServer(ff, 'knowledge/detail')
            if (up2.error) return NextResponse.json({ message: 'Failed to upload detail logo' }, { status: 500 })
            logos.push(up2.url as string)
          }
          j++
        }

        // Handle jenis details
        const resolvedJenisDetails = []
        for (let jenisIdx = 0; jenisIdx < d.jenisDetails.length; jenisIdx++) {
          const jenis = d.jenisDetails[jenisIdx]
          const jenisFile = formData.get(`jenisLogo_${d.index}_${jenisIdx}`) as File | null
          const jenisLogos: string[] = []
          
          if (jenisFile && jenisFile.size > 0) {
            const up = await uploadFileServer(jenisFile, 'knowledge/jenis')
            if (up.error) {
              return NextResponse.json({ message: 'Failed to upload jenis logo' }, { status: 500 })
            }
            jenisLogos.push(up.url as string)
          }
          
          // multiple jenis logos: jenisLogo_{index}_{jenisIdx}_{k}
          let k = 0
          while (true) {
            const ff = formData.get(`jenisLogo_${d.index}_${jenisIdx}_${k}`) as File | null
            if (!ff) break
            if (ff.size > 0) {
              const up2 = await uploadFileServer(ff, 'knowledge/jenis')
              if (up2.error) return NextResponse.json({ message: 'Failed to upload jenis logo' }, { status: 500 })
              jenisLogos.push(up2.url as string)
            }
            k++
          }

          // Handle produk jenis details
          const resolvedProdukDetails = []
          for (let produkIdx = 0; produkIdx < jenis.produkJenisDetails.length; produkIdx++) {
            const produk = jenis.produkJenisDetails[produkIdx]
            const produkFile = formData.get(`produkLogo_${d.index}_${jenisIdx}_${produkIdx}`) as File | null
            const produkLogos: string[] = []
            
            if (produkFile && produkFile.size > 0) {
              const up = await uploadFileServer(produkFile, 'knowledge/produk')
              if (up.error) {
                return NextResponse.json({ message: 'Failed to upload produk logo' }, { status: 500 })
              }
              produkLogos.push(up.url as string)
            }
            
            // multiple produk logos: produkLogo_{index}_{jenisIdx}_{produkIdx}_{l}
            let l = 0
            while (true) {
              const ff = formData.get(`produkLogo_${d.index}_${jenisIdx}_${produkIdx}_${l}`) as File | null
              if (!ff) break
              if (ff.size > 0) {
                const up2 = await uploadFileServer(ff, 'knowledge/produk')
                if (up2.error) return NextResponse.json({ message: 'Failed to upload produk logo' }, { status: 500 })
                produkLogos.push(up2.url as string)
              }
              l++
            }

            resolvedProdukDetails.push({
              name: produk.name.trim(),
              description: produk.description || '',
              logos: produkLogos
            })
          }

          resolvedJenisDetails.push({
            name: jenis.name.trim(),
            description: jenis.description || '',
            logos: jenisLogos,
            produkJenisDetails: resolvedProdukDetails
          })
        }
        
        resolved.push({ 
          name: d.name?.trim() || '', 
          description: d.description || '', 
          logos,
          jenisDetails: resolvedJenisDetails
        })
      }
      // Clear existing details and update knowledge using per-request Prisma client
      await withRetry(async () => {
        const prisma = createPrismaClient()
        try {
          await prisma.detailKnowledge.deleteMany({ where: { knowledgeId: id } })
          return await prisma.knowledge.update({
            where: { id },
            data: {
              ...(title ? { title: title.trim() } : {}),
              ...(description !== undefined ? { description } : {}),
              ...(logosToSet.length ? { logos: { push: logosToSet } } : {}),
              updatedBy,
              ...(updateNotes ? { updateNotes: updateNotes.trim() } : {}),
              detailKnowledges: {
                create: resolved.map(r => ({ 
                  name: r.name, 
                  description: r.description, 
                  logos: r.logos,
                  jenisDetailKnowledges: {
                    create: r.jenisDetails.map(jenis => ({
                      name: jenis.name,
                      description: jenis.description,
                      logos: jenis.logos,
                      produkJenisDetailKnowledges: {
                        create: jenis.produkJenisDetails.map(produk => ({
                          name: produk.name,
                          description: produk.description,
                          logos: produk.logos
                        }))
                      }
                    }))
                  }
                }))
              }
            }
          })
        } finally {
          await prisma.$disconnect()
        }
      })
    } else {
      await withRetry(async () => {
        const prisma = createPrismaClient()
        try {
          return await prisma.knowledge.update({
            where: { id },
            data: {
              ...(title ? { title: title.trim() } : {}),
              ...(description !== undefined ? { description } : {}),
              ...(logosToSet.length ? { logos: { push: logosToSet } } : {}),
              updatedBy,
              ...(updateNotes ? { updateNotes: updateNotes.trim() } : {})
            }
          })
        } finally {
          await prisma.$disconnect()
        }
      })
    }

    const updated = await withRetry(async () => {
      const prisma = createPrismaClient()
      try {
        return await prisma.knowledge.findUnique({
          where: { id },
          select: {
            id: true,
            title: true,
            description: true,
            logos: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            updatedBy: true,
            detailKnowledges: { 
              select: { 
                id: true, 
                name: true, 
                description: true, 
                logos: true,
                jenisDetailKnowledges: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logos: true,
                    produkJenisDetailKnowledges: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        logos: true
                      }
                    }
                  }
                }
              } 
            }
          }
        })
      } finally {
        await prisma.$disconnect()
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating knowledge:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
