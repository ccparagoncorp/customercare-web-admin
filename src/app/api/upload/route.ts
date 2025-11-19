import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { uploadProductFileServer, uploadSOPFileServer, uploadQTFileServer, uploadAgentPhotoServer } from '@/lib/supabase-storage'

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
    const file = formData.get('file') as File
    const path = formData.get('path') as string

    if (!file || !path) {
      return NextResponse.json({ error: 'File and path are required' }, { status: 400 })
    }

    // Determine which upload function to use based on path
    let result
    if (path.includes('agents') || path.includes('agent')) {
      result = await uploadAgentPhotoServer(file, path)
    } else if (path.includes('jenis-sop') || path.includes('sop')) {
      result = await uploadSOPFileServer(file, path)
    } else if (
      path.includes('quality-training') ||
      path.includes('jenis-quality-training') ||
      path.includes('detail-quality-training') ||
      path.includes('subdetail-quality-training')
    ) {
      result = await uploadQTFileServer(file, path)
    } else {
      result = await uploadProductFileServer(file, path)
    }
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
