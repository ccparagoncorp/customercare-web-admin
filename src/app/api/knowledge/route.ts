import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import { uploadFileServer, deleteFileServer } from '@/lib/supabase-storage'

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
                  logos: true
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
    const details = JSON.parse(formData.get('details') as string || '[]') as Array<{ index: number; name: string; description: string }>

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
    const resolvedDetails = [] as Array<{ name: string; description: string; logoUrl: string | null; logos: string[] }>
    for (const d of details) {
      const file = formData.get(`detailLogo_${d.index}`) as File | null
      let logoUrl: string | null = null
      const logos: string[] = []
      if (file && file.size > 0) {
        const up = await uploadFileServer(file, 'knowledge/detail')
        if (up.error) {
          return NextResponse.json({ message: 'Failed to upload detail logo' }, { status: 500 })
        }
        logoUrl = up.url
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
          if (!logoUrl) logoUrl = up2.url
        }
        j++
      }
      resolvedDetails.push({ name: d.name, description: d.description, logoUrl, logos })
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
                logos: detail.logos
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
                logos: true
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
                logos: true
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

    // Delete logos from storage (best-effort)
    if (existingKnowledge.logos?.length) {
      for (const url of existingKnowledge.logos) {
        await deleteFileServer(url)
      }
    }
    for (const d of existingKnowledge.detailKnowledges) {
      if (d.logos?.length) {
        for (const url of d.logos) {
          await deleteFileServer(url)
        }
      }
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
      const parsed = JSON.parse(detailsRaw) as Array<{ index: number; name: string; description: string; existingLogoUrl?: string | null }>
      const resolved: Array<{ name: string; description: string; logo: string | null; logos: string[] }> = []
      for (const d of parsed) {
        const file = formData.get(`detailLogo_${d.index}`) as File | null
        let detailLogo: string | null = d.existingLogoUrl ?? null
        const logos: string[] = []
        
        if (file && file.size > 0) {
          const up = await uploadFileServer(file, 'knowledge/detail')
          if (up.error) {
            return NextResponse.json({ message: 'Failed to upload detail logo' }, { status: 500 })
          }
          detailLogo = up.url
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
            if (!detailLogo) detailLogo = up2.url
          }
          j++
        }
        
        resolved.push({ name: d.name?.trim() || '', description: d.description || '', logo: detailLogo, logos })
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
                create: resolved.map(r => ({ name: r.name, description: r.description, logos: r.logos }))
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
                logos: true 
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
