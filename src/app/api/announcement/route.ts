import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry, withAuditUser } from '@/lib/prisma'
import { uploadAnnouncementFileServer, deleteAnnouncementFilesServer } from '@/lib/supabase-storage'
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

// GET /api/announcement - Get all announcements
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const prisma = createPrismaClient()
    const where: Prisma.AnnouncementWhereInput = {}

    if (search) {
      where.OR = [
        { judul: { contains: search, mode: 'insensitive' } },
        { deskripsi: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [announcements, total] = await withRetry(async () => {
      try {
        return await Promise.all([
          prisma.announcement.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
              createdAt: 'desc'
            }
          }),
          prisma.announcement.count({ where })
        ])
      } finally {
        await prisma.$disconnect()
      }
    })

    return NextResponse.json({
      announcements,
      pagination: {
        page,
        limit,
        total: Number(total),
        pages: Math.ceil(Number(total) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/announcement - Create new announcement
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

    const formData = await request.formData()
    const judul = formData.get('judul') as string
    const deskripsi = formData.get('deskripsi') as string
    const link = formData.get('link') as string

    if (!judul) {
      return NextResponse.json({ error: 'Judul is required' }, { status: 400 })
    }

    // Upload images
    const imageUrls: string[] = []
    let imageIndex = 0
    while (true) {
      const imageFile = formData.get(`image_${imageIndex}`) as File | null
      if (!imageFile || imageFile.size === 0) {
        // Also check for 'image' without index (for single image upload)
        if (imageIndex === 0) {
          const singleImage = formData.get('image') as File | null
          if (singleImage && singleImage.size > 0) {
            const uploadResult = await uploadAnnouncementFileServer(singleImage, 'images')
            if (uploadResult.error || !uploadResult.url) {
              return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
            }
            imageUrls.push(uploadResult.url)
          }
        }
        break
      }

      const uploadResult = await uploadAnnouncementFileServer(imageFile, 'images')
      if (uploadResult.error || !uploadResult.url) {
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
      }
      imageUrls.push(uploadResult.url)
      imageIndex++
    }

    const prisma = createPrismaClient()
    const announcement = await withAuditUser(prisma, user.id, async (tx) => {
      return await tx.announcement.create({
        data: {
          judul: judul.trim(),
          deskripsi: deskripsi || null,
          link: link || null,
          image: imageUrls,
          createdBy: user.name
        }
      })
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/announcement - Delete announcement
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    
    // Get announcement to get image URLs
    const announcement = await withRetry(async () => {
      try {
        return await prisma.announcement.findUnique({
          where: { id },
          select: { image: true }
        })
      } finally {
        await prisma.$disconnect()
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Delete images from storage
    if (announcement.image && announcement.image.length > 0) {
      await deleteAnnouncementFilesServer(announcement.image)
    }

    // Delete announcement
    await withAuditUser(prisma, user.id, async (tx) => {
      return await tx.announcement.delete({ where: { id } })
    })

    return NextResponse.json({ message: 'Announcement deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

