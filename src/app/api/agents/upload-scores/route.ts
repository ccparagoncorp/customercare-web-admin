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
  afrt: number | string
  art: number | string
  rt: number | string
  rr: number | string
  csat: number | string
  qaScoreRemarks: string | null
  quizScoreRemarks: string | null
  typingTestScoreRemarks: string | null
  afrtRemarks: string | null
  artRemarks: string | null
  rtRemarks: string | null
  rrRemarks: string | null
  csatRemarks: string | null
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
    const rows: ScoreRow[] = []

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

    const normalizeHeader = (value: string) => value.replace(/[\s_]/g, '')
    const findHeaderIndex = (patterns: string[]) =>
      headerRow.findIndex(h => patterns.some(pattern => normalizeHeader(h) === normalizeHeader(pattern.toLowerCase())))

    const namaIndex = findHeaderIndex(['nama', 'name'])
    const qascoreIndex = findHeaderIndex(['qascore', 'qa score', 'qa_score'])
    const quizscoreIndex = findHeaderIndex(['quizscore', 'quiz score', 'quiz_score'])
    const typingtestscoreIndex = findHeaderIndex(['typingtestscore', 'typing test score', 'typing_test_score', 'typingtest'])
    const afrtIndex = findHeaderIndex(['afrt'])
    const artIndex = findHeaderIndex(['art'])
    const rtIndex = findHeaderIndex(['rt'])
    const rrIndex = findHeaderIndex(['rr'])
    const csatIndex = findHeaderIndex(['csat'])

    const qaRemarksIndex = findHeaderIndex(['remarks qascore', 'qascore remarks', 'remarks_qascore', 'qascore_remarks'])
    const quizRemarksIndex = findHeaderIndex(['remarks quizscore', 'quizscore remarks', 'remarks_quizscore', 'quizscore_remarks'])
    const typingRemarksIndex = findHeaderIndex(['remarks typingtestscore', 'typingtestscore remarks', 'remarks_typingtestscore', 'typingtestscore_remarks'])
    const afrtRemarksIndex = findHeaderIndex(['remarks afrt', 'afrt remarks', 'remarks_afrt'])
    const artRemarksIndex = findHeaderIndex(['remarks art', 'art remarks', 'remarks_art'])
    const rtRemarksIndex = findHeaderIndex(['remarks rt', 'rt remarks', 'remarks_rt'])
    const rrRemarksIndex = findHeaderIndex(['remarks rr', 'rr remarks', 'remarks_rr'])
    const csatRemarksIndex = findHeaderIndex(['remarks csat', 'csat remarks', 'remarks_csat'])

    if (namaIndex === -1) {
      return NextResponse.json(
        { message: 'Kolom "nama" tidak ditemukan di file Excel' },
        { status: 400 }
      )
    }

    const hasScoreColumn = [
      qascoreIndex,
      quizscoreIndex,
      typingtestscoreIndex,
      afrtIndex,
      artIndex,
      rtIndex,
      rrIndex,
      csatIndex
    ].some(index => index !== -1)

    if (!hasScoreColumn) {
      return NextResponse.json(
        { message: 'Minimal satu kolom nilai (qascore, quizscore, typingtestscore, afrt, art, rt, rr, atau csat) harus ada' },
        { status: 400 }
      )
    }

    const parseRemarkValue = (value: unknown): string | null => {
      if (value === null || value === undefined) return null
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : null
      }
      const strValue = String(value).trim()
      return strValue.length > 0 ? strValue : null
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
      const afrt = afrtIndex !== -1 ? row[afrtIndex] : null
      const art = artIndex !== -1 ? row[artIndex] : null
      const rt = rtIndex !== -1 ? row[rtIndex] : null
      const rr = rrIndex !== -1 ? row[rrIndex] : null
      const csat = csatIndex !== -1 ? row[csatIndex] : null
      const qaRemarksRaw = qaRemarksIndex !== -1 ? row[qaRemarksIndex] : null
      const quizRemarksRaw = quizRemarksIndex !== -1 ? row[quizRemarksIndex] : null
      const typingRemarksRaw = typingRemarksIndex !== -1 ? row[typingRemarksIndex] : null
      const afrtRemarksRaw = afrtRemarksIndex !== -1 ? row[afrtRemarksIndex] : null
      const artRemarksRaw = artRemarksIndex !== -1 ? row[artRemarksIndex] : null
      const rtRemarksRaw = rtRemarksIndex !== -1 ? row[rtRemarksIndex] : null
      const rrRemarksRaw = rrRemarksIndex !== -1 ? row[rrRemarksIndex] : null
      const csatRemarksRaw = csatRemarksIndex !== -1 ? row[csatRemarksIndex] : null

      rows.push({
        nama: typeof nama === 'string' ? nama.trim() : String(nama).trim(),
        qascore: qascore ?? 0,
        quizscore: quizscore ?? 0,
        typingtestscore: typingtestscore ?? 0,
        afrt: afrt ?? 0,
        art: art ?? 0,
        rt: rt ?? 0,
        rr: rr ?? 0,
        csat: csat ?? 0,
        qaScoreRemarks: parseRemarkValue(qaRemarksRaw),
        quizScoreRemarks: parseRemarkValue(quizRemarksRaw),
        typingTestScoreRemarks: parseRemarkValue(typingRemarksRaw),
        afrtRemarks: parseRemarkValue(afrtRemarksRaw),
        artRemarks: parseRemarkValue(artRemarksRaw),
        rtRemarks: parseRemarkValue(rtRemarksRaw),
        rrRemarks: parseRemarkValue(rrRemarksRaw),
        csatRemarks: parseRemarkValue(csatRemarksRaw)
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
        const parsedAfrt = parseScore(row.afrt)
        const parsedArt = parseScore(row.art)
        const parsedRt = parseScore(row.rt)
        const parsedRr = parseScore(row.rr)
        const parsedCsat = parseScore(row.csat)

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
              qaScoreRemarks: row.qaScoreRemarks,
              quizScore: parsedQuiz,
              quizScoreRemarks: row.quizScoreRemarks,
              typingTestScore: parsedTyping,
              typingTestScoreRemarks: row.typingTestScoreRemarks,
              afrt: parsedAfrt,
              afrtRemarks: row.afrtRemarks,
              art: parsedArt,
              artRemarks: row.artRemarks,
              rt: parsedRt,
              rtRemarks: row.rtRemarks,
              rr: parsedRr,
              rrRemarks: row.rrRemarks,
              csat: parsedCsat,
              csatRemarks: row.csatRemarks,
              timestamp: now
            }
          }))
        } else {
          // Create new Performance record if no record exists in current month
          await withRetry(() => prisma.performance.create({
            data: {
              agentId: agentId,
              qaScore: parsedQa,
              qaScoreRemarks: row.qaScoreRemarks,
              quizScore: parsedQuiz,
              quizScoreRemarks: row.quizScoreRemarks,
              typingTestScore: parsedTyping,
              typingTestScoreRemarks: row.typingTestScoreRemarks,
              afrt: parsedAfrt,
              afrtRemarks: row.afrtRemarks,
              art: parsedArt,
              artRemarks: row.artRemarks,
              rt: parsedRt,
              rtRemarks: row.rtRemarks,
              rr: parsedRr,
              rrRemarks: row.rrRemarks,
              csat: parsedCsat,
              csatRemarks: row.csatRemarks,
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

