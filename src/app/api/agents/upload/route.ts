import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import bcrypt from 'bcryptjs'

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

interface AgentRow {
  namaLengkap: string
  email: string
  kategori: string
  password: string
}

// Supabase client for auth operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions) as Session | null
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or super admin
    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { message: 'File diperlukan' },
        { status: 400 }
      )
    }

    const rows: AgentRow[] = []

    // Handle file upload
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Read first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null 
    }) as (string | number | null | undefined)[][]

    if (jsonData.length < 2) {
      return NextResponse.json(
        { message: 'File Excel harus memiliki header dan minimal 1 baris data' },
        { status: 400 }
      )
    }

    // Find header row (case-insensitive)
    const headerRow = jsonData[0].map((h: string | number | null | undefined) => 
      typeof h === 'string' ? h.toLowerCase().trim() : ''
    )

    const namaIndex = headerRow.findIndex(h => 
      h === 'nama lengkap' || h === 'nama' || h === 'name'
    )
    const emailIndex = headerRow.findIndex(h => 
      h === 'email'
    )
    const kategoriIndex = headerRow.findIndex(h => 
      h === 'kategori' || h === 'category'
    )
    const passwordIndex = headerRow.findIndex(h => 
      h === 'password'
    )

    if (namaIndex === -1) {
      return NextResponse.json(
        { message: 'Kolom "Nama Lengkap" tidak ditemukan di file Excel' },
        { status: 400 }
      )
    }

    if (emailIndex === -1) {
      return NextResponse.json(
        { message: 'Kolom "Email" tidak ditemukan di file Excel' },
        { status: 400 }
      )
    }

    if (passwordIndex === -1) {
      return NextResponse.json(
        { message: 'Kolom "Password" tidak ditemukan di file Excel' },
        { status: 400 }
      )
    }

    // Parse data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      const namaLengkap = row[namaIndex]
      const email = row[emailIndex]
      const kategori = kategoriIndex !== -1 ? row[kategoriIndex] : null
      const password = row[passwordIndex]
      
      if (!namaLengkap || (typeof namaLengkap === 'string' && namaLengkap.trim() === '')) {
        continue // Skip empty rows
      }

      if (!email || (typeof email === 'string' && email.trim() === '')) {
        continue // Skip rows without email
      }

      if (!password || (typeof password === 'string' && password.trim() === '')) {
        continue // Skip rows without password
      }

      rows.push({
        namaLengkap: typeof namaLengkap === 'string' ? namaLengkap.trim() : String(namaLengkap).trim(),
        email: typeof email === 'string' ? email.trim() : String(email).trim(),
        kategori: kategori ? (typeof kategori === 'string' ? kategori.trim() : String(kategori).trim()) : 'socialMedia',
        password: typeof password === 'string' ? password.trim() : String(password).trim()
      })
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { message: 'Tidak ada data yang valid di file Excel' },
        { status: 400 }
      )
    }

    const prisma = createPrismaClient()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // Process each row
    const uploadTimestamp = new Date()
    const results = {
      success: [] as Array<{ nama: string; email: string }>,
      errors: [] as Array<{ nama: string; email: string; error: string }>
    }

    // Get all existing agents and users for validation
    const existingAgents = await withRetry(() => prisma.agent.findMany({
      select: {
        email: true
      }
    }))

    const existingEmails = new Set(existingAgents.map(a => a.email.toLowerCase().trim()))

    // Get existing Supabase Auth users
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthEmails = new Set(
      users.users.map(u => u.email?.toLowerCase().trim()).filter(Boolean) as string[]
    )

    for (const row of rows) {
      try {
        // Validate email format
        if (!emailRegex.test(row.email)) {
          results.errors.push({
            nama: row.namaLengkap,
            email: row.email,
            error: 'Format email tidak valid'
          })
          continue
        }

        // Validate password length
        if (row.password.length < 6) {
          results.errors.push({
            nama: row.namaLengkap,
            email: row.email,
            error: 'Password harus minimal 6 karakter'
          })
          continue
        }

        // Check if email already exists
        const emailLower = row.email.toLowerCase().trim()
        if (existingEmails.has(emailLower) || existingAuthEmails.has(emailLower)) {
          results.errors.push({
            nama: row.namaLengkap,
            email: row.email,
            error: 'Email sudah terdaftar'
          })
          continue
        }

        // Validate category
        const category = (row.kategori === 'eCommerce' || row.kategori === 'ecommerce') 
          ? 'eCommerce' 
          : 'socialMedia'

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: emailLower,
          password: row.password,
          email_confirm: true,
          user_metadata: {
            name: row.namaLengkap,
            role: 'AGENT',
            category: category
          }
        })

        if (authError) {
          results.errors.push({
            nama: row.namaLengkap,
            email: row.email,
            error: `Error creating auth user: ${authError.message}`
          })
          continue
        }

        // Hash password before storing in database
        const hashedPassword = await bcrypt.hash(row.password, 12)

        // Create agent profile in database
        await withRetry(() => prisma.agent.create({
          data: {
            id: authData.user.id,
            name: row.namaLengkap,
            email: emailLower,
            password: hashedPassword,
            category: category,
            isActive: true,
            createdAt: uploadTimestamp // Use upload timestamp
          }
        }))

        // Add to existing sets to prevent duplicates in same batch
        existingEmails.add(emailLower)
        existingAuthEmails.add(emailLower)

        results.success.push({
          nama: row.namaLengkap,
          email: row.email
        })
      } catch (error) {
        console.error(`Error processing ${row.namaLengkap}:`, error)
        results.errors.push({ 
          nama: row.namaLengkap, 
          email: row.email,
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      message: 'Upload selesai',
      summary: {
        total: rows.length,
        success: results.success.length,
        errors: results.errors.length
      },
      details: {
        success: results.success,
        errors: results.errors
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error uploading agents:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

