import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import * as XLSX from 'xlsx'

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

interface ScoreRow {
  nama: string
  qascore: number | string
  quizscore: number | string
  typingtestscore: number | string
}

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
    const spreadsheetUrl = formData.get('spreadsheetUrl') as string | null

    if (!file && !spreadsheetUrl) {
      return NextResponse.json(
        { message: 'File atau spreadsheet URL diperlukan' },
        { status: 400 }
      )
    }

    let workbook: XLSX.WorkBook
    let rows: ScoreRow[] = []

    // Handle file upload
    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      workbook = XLSX.read(arrayBuffer, { type: 'array' })
    } 
    // Handle Google Sheets URL (future implementation)
    else if (spreadsheetUrl) {
      // For now, we'll support direct file upload only
      // Google Sheets integration can be added later if needed
      return NextResponse.json(
        { message: 'Google Sheets URL support belum tersedia. Silakan upload file Excel.' },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { message: 'File atau spreadsheet URL diperlukan' },
        { status: 400 }
      )
    }

    // Read first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null 
    }) as any[][]

    if (jsonData.length < 2) {
      return NextResponse.json(
        { message: 'File Excel harus memiliki header dan minimal 1 baris data' },
        { status: 400 }
      )
    }

    // Find header row (case-insensitive)
    const headerRow = jsonData[0].map((h: any) => 
      typeof h === 'string' ? h.toLowerCase().trim() : ''
    )

    const namaIndex = headerRow.findIndex(h => 
      h === 'nama' || h === 'name'
    )
    const qascoreIndex = headerRow.findIndex(h => 
      h === 'qascore' || h === 'qa score' || h === 'qa_score'
    )
    const quizscoreIndex = headerRow.findIndex(h => 
      h === 'quizscore' || h === 'quiz score' || h === 'quiz_score'
    )
    const typingtestscoreIndex = headerRow.findIndex(h => 
      h === 'typingtestscore' || h === 'typing test score' || h === 'typing_test_score' || h === 'typingtest'
    )

    if (namaIndex === -1) {
      return NextResponse.json(
        { message: 'Kolom "nama" tidak ditemukan di file Excel' },
        { status: 400 }
      )
    }

    if (qascoreIndex === -1 && quizscoreIndex === -1 && typingtestscoreIndex === -1) {
      return NextResponse.json(
        { message: 'Minimal satu kolom score (qascore, quizscore, atau typingtestscore) harus ada' },
        { status: 400 }
      )
    }

    // Parse data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      const nama = row[namaIndex]
      
      if (!nama || (typeof nama === 'string' && nama.trim() === '')) {
        continue // Skip empty rows
      }

      const qascore = qascoreIndex !== -1 ? row[qascoreIndex] : null
      const quizscore = quizscoreIndex !== -1 ? row[quizscoreIndex] : null
      const typingtestscore = typingtestscoreIndex !== -1 ? row[typingtestscoreIndex] : null

      rows.push({
        nama: typeof nama === 'string' ? nama.trim() : String(nama).trim(),
        qascore: qascore ?? 0,
        quizscore: quizscore ?? 0,
        typingtestscore: typingtestscore ?? 0
      })
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { message: 'Tidak ada data yang valid di file Excel' },
        { status: 400 }
      )
    }

    const prisma = createPrismaClient()

    // Get all agents for name matching
    const allAgents = await withRetry(() => prisma.agent.findMany({
      select: {
        id: true,
        name: true
      }
    }))

    // Create a map for faster lookup (case-insensitive)
    const agentMap = new Map<string, string>()
    allAgents.forEach(agent => {
      agentMap.set(agent.name.toLowerCase().trim(), agent.id)
    })

    // Process each row
    const now = new Date()
    const results = {
      success: [] as Array<{ nama: string; agentId: string }>,
      notFound: [] as Array<{ nama: string }>,
      errors: [] as Array<{ nama: string; error: string }>
    }

    for (const row of rows) {
      const agentId = agentMap.get(row.nama.toLowerCase().trim())

      if (!agentId) {
        results.notFound.push({ nama: row.nama })
        continue
      }

      try {
        // Parse scores
        const parseScore = (value: unknown): number => {
          if (value === null || value === undefined) return 0
          const parsed = Number(value)
          return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
        }

        const parsedQa = parseScore(row.qascore)
        const parsedQuiz = parseScore(row.quizscore)
        const parsedTyping = parseScore(row.typingtestscore)

        // Check if performance exists in the same month
        const existingPerformance = await withRetry(async () => {
          const results = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id 
            FROM performances 
            WHERE agent_id = ${agentId}
              AND date_trunc('month', timestamp) = date_trunc('month', ${now}::timestamp)
            LIMIT 1
          `
          if (results && results.length > 0) {
            return results[0].id
          }
          return null
        })

        if (existingPerformance) {
          // Update existing record in the same month
          await withRetry(() => prisma.performance.update({
            where: { id: existingPerformance },
            data: {
              qaScore: parsedQa,
              quizScore: parsedQuiz,
              typingTestScore: parsedTyping,
              timestamp: now
            }
          }))
        } else {
          // Create new Performance record if no record exists in current month
          await withRetry(() => prisma.performance.create({
            data: {
              agentId: agentId,
              qaScore: parsedQa,
              quizScore: parsedQuiz,
              typingTestScore: parsedTyping,
              timestamp: now
            }
          }))
        }

        results.success.push({ nama: row.nama, agentId })
      } catch (error) {
        console.error(`Error processing ${row.nama}:`, error)
        results.errors.push({ 
          nama: row.nama, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      message: 'Upload selesai',
      summary: {
        total: rows.length,
        success: results.success.length,
        notFound: results.notFound.length,
        errors: results.errors.length
      },
      details: {
        success: results.success,
        notFound: results.notFound,
        errors: results.errors
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error uploading scores:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

