import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry, withAuditUser } from '@/lib/prisma'
import { uploadAnnouncementFileServer, deleteAnnouncementFileServer } from '@/lib/supabase-storage'

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

// GET /api/announcement/[id] - Get announcement by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    const prisma = createPrismaClient()
    const announcement = await withRetry(async () => {
      try {
        return await prisma.announcement.findUnique({
          where: { id }
        })
      } finally {
        await prisma.$disconnect()
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/announcement/[id] - Update announcement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    const formData = await request.formData()
    const judul = formData.get('judul') as string
    const deskripsi = formData.get('deskripsi') as string
    const link = formData.get('link') as string
    const removedImages = JSON.parse(formData.get('removedImages') as string || '[]') as string[]

    if (!judul) {
      return NextResponse.json({ error: 'Judul is required' }, { status: 400 })
    }

    const prisma = createPrismaClient()
    
    // Get existing announcement
    const existingAnnouncement = await withRetry(async () => {
      try {
        return await prisma.announcement.findUnique({
          where: { id },
          select: { image: true }
        })
      } finally {
        await prisma.$disconnect()
      }
    })

    if (!existingAnnouncement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Delete removed images from storage
    for (const imageUrl of removedImages) {
      await deleteAnnouncementFileServer(imageUrl)
    }

    // Get existing images that are not being removed
    const existingImages = existingAnnouncement.image || []
    const imagesToKeep = existingImages.filter(img => !removedImages.includes(img))

    // Upload new images
    const newImageUrls: string[] = []
    let imageIndex = 0
    while (true) {
      const imageFile = formData.get(`image_${imageIndex}`) as File | null
      if (!imageFile || imageFile.size === 0) {
        if (imageIndex === 0) {
          const singleImage = formData.get('image') as File | null
          if (singleImage && singleImage.size > 0) {
            const uploadResult = await uploadAnnouncementFileServer(singleImage, 'images')
            if (uploadResult.error || !uploadResult.url) {
              return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
            }
            newImageUrls.push(uploadResult.url)
          }
        }
        break
      }

      const uploadResult = await uploadAnnouncementFileServer(imageFile, 'images')
      if (uploadResult.error || !uploadResult.url) {
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
      }
      newImageUrls.push(uploadResult.url)
      imageIndex++
    }

    // Combine existing images (that are kept) with new images
    const allImages = [...imagesToKeep, ...newImageUrls]

    // Update announcement
    const updatedAnnouncement = await withAuditUser(prisma, user.id, async (tx) => {
      return await tx.announcement.update({
        where: { id },
        data: {
          judul: judul.trim(),
          deskripsi: deskripsi || null,
          link: link || null,
          image: allImages,
          updatedBy: user.name
        }
      })
    })

    return NextResponse.json(updatedAnnouncement)
  } catch (error) {
    console.error('Error updating announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

