import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import { deleteProductFileServer } from '@/lib/supabase-storage'

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

export async function DELETE(
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

    const { id } = await params

    const prisma = createPrismaClient()
    
    // Get detail to delete images
    const detail = await withRetry(() => prisma.detailProduk.findUnique({
      where: { id }
    }))

    if (detail && detail.images && detail.images.length > 0) {
      // Delete detail images
      for (const imageUrl of detail.images) {
        try {
          await deleteProductFileServer(imageUrl)
        } catch (error) {
          console.error('Error deleting detail image:', imageUrl, error)
        }
      }
    }

    await withRetry(() => prisma.detailProduk.delete({
      where: { id }
    }))

    return NextResponse.json({ message: 'Product detail deleted successfully' })
  } catch (error) {
    console.error('Error deleting product detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
