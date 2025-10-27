import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'knowledge'
const productBucketName = process.env.PRODUCT_BUCKET_NAME || 'products'

// Client-side supabase (anon)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side supabase (service role) — use ONLY on the server
function getServerSupabase() {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables')
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

async function retry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 1000): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e: any) {
      lastErr = e
      const msg = String(e?.message || '')
      const isTimeout = msg.includes('Connect Timeout') || msg.includes('UND_ERR_CONNECT_TIMEOUT') || msg.includes('fetch failed') || msg.includes('timeout')
      if (i === attempts - 1 || !isTimeout) break
      console.log(`Retry attempt ${i + 1}/${attempts} after ${baseDelayMs * (i + 1)}ms`)
      await new Promise(r => setTimeout(r, baseDelayMs * (i + 1)))
    }
  }
  throw lastErr
}

export async function uploadFile(file: File, path: string): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    const fullPath = `${path}/${fileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { url: null, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fullPath)

    return { url: urlData.publicUrl, error: null }
  } catch (error) {
    console.error('Upload error:', error)
    return { url: null, error: 'Failed to upload file' }
  }
}

// Server-only upload that bypasses RLS using the service role key
export async function uploadFileServer(file: File, path: string): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    const serverSupabase = getServerSupabase()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    const fullPath = `${path}/${fileName}`

    const { error } = await retry(() => serverSupabase.storage
      .from(bucketName)
      .upload(fullPath, file, { cacheControl: '3600', upsert: false }), 3, 500)

    if (error) {
      console.error('Upload (server) error:', error)
      return { url: null, error: error.message }
    }

    const { data: urlData } = serverSupabase.storage
      .from(bucketName)
      .getPublicUrl(fullPath)

    return { url: urlData.publicUrl, error: null }
  } catch (error) {
    console.error('Upload (server) error:', error)
    return { url: null, error: 'Failed to upload file (server)' }
  }
}

export async function deleteFile(path: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

function extractPathFromPublicUrl(publicUrl: string): string | null {
  try {
    // Expected: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
    const publicBase = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/`
    if (!publicUrl.startsWith(publicBase)) return null
    const remainder = publicUrl.slice(publicBase.length)
    const parts = remainder.split('/')
    const bucket = parts.shift() // first segment is bucket
    if (!bucket || bucket !== (process.env.SUPABASE_BUCKET_NAME || 'knowledge')) return null
    return parts.join('/')
  } catch {
    return null
  }
}

// Server-only delete accepting either a storage path or a public URL
export async function deleteFileServer(pathOrUrl: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const serverSupabase = getServerSupabase()
    const path = pathOrUrl.startsWith('http') ? extractPathFromPublicUrl(pathOrUrl) : pathOrUrl
    if (!path) {
      return { success: false, error: 'Invalid storage path or URL' }
    }
    const { error } = await serverSupabase.storage
      .from(bucketName)
      .remove([path])
    if (error) {
      console.error('Delete (server) error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, error: null }
  } catch (e) {
    console.error('Delete (server) unexpected error:', e)
    return { success: false, error: 'Failed to delete file (server)' }
  }
}

// Server-only batch delete for multiple paths or public URLs
export async function deleteFilesServer(pathsOrUrls: string[]): Promise<{ success: boolean; error: string | null; deleted: number }> {
  try {
    const serverSupabase = getServerSupabase()
    const paths: string[] = []
    for (const item of pathsOrUrls) {
      const p = item.startsWith('http') ? extractPathFromPublicUrl(item) : item
      if (p) paths.push(p)
    }
    if (paths.length === 0) {
      return { success: false, error: 'No valid storage paths to delete', deleted: 0 }
    }
    const { error } = await serverSupabase.storage.from(bucketName).remove(paths)
    if (error) {
      console.error('Batch delete (server) error:', error)
      return { success: false, error: error.message, deleted: 0 }
    }
    return { success: true, error: null, deleted: paths.length }
  } catch (e) {
    console.error('Batch delete (server) unexpected error:', e)
    return { success: false, error: 'Failed to delete files (server)', deleted: 0 }
  }
}

// Product-specific upload functions
export async function uploadProductFile(file: File, path: string): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    // Use server-side upload to bypass RLS
    return await uploadProductFileServer(file, path)
  } catch (error) {
    console.error('Product upload error:', error)
    return { url: null, error: 'Failed to upload product file' }
  }
}

// Server-only product upload
export async function uploadProductFileServer(file: File, path: string): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    const serverSupabase = getServerSupabase()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    const fullPath = `${path}/${fileName}`

    const { error } = await retry(() => serverSupabase.storage
      .from(productBucketName)
      .upload(fullPath, file, { cacheControl: '3600', upsert: false }), 3, 2000)

    if (error) {
      console.error('Product upload (server) error:', error)
      return { url: null, error: error.message }
    }

    const { data: urlData } = serverSupabase.storage
      .from(productBucketName)
      .getPublicUrl(fullPath)

    return { url: urlData.publicUrl, error: null }
  } catch (error) {
    console.error('Product upload (server) error:', error)
    return { url: null, error: 'Failed to upload product file (server)' }
  }
}

// Product-specific delete functions
export async function deleteProductFile(path: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage
      .from(productBucketName)
      .remove([path])

    if (error) {
      console.error('Product delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Product delete error:', error)
    return { success: false, error: 'Failed to delete product file' }
  }
}

// Server-only product delete
export async function deleteProductFileServer(pathOrUrl: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const serverSupabase = getServerSupabase()
    const path = pathOrUrl.startsWith('http') ? extractPathFromPublicUrl(pathOrUrl) : pathOrUrl
    if (!path) {
      return { success: false, error: 'Invalid product storage path or URL' }
    }
    const { error } = await serverSupabase.storage
      .from(productBucketName)
      .remove([path])
    if (error) {
      console.error('Product delete (server) error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, error: null }
  } catch (e) {
    console.error('Product delete (server) unexpected error:', e)
    return { success: false, error: 'Failed to delete product file (server)' }
  }
}