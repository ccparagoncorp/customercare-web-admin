import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import { normalizeEmptyStrings } from '@/lib/utils/normalize'
import { uploadAgentPhotoServer, deleteAgentPhotoServer } from '@/lib/supabase-storage'
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

interface PrismaWhere {
  OR?: Array<{
    name?: { startsWith: string; mode: 'insensitive' } | { contains: string; mode: 'insensitive' }
    email?: { startsWith: string; mode: 'insensitive' } | { contains: string; mode: 'insensitive' }
  }>
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

    // Handle both JSON and FormData
    type AgentBody = {
      name?: string
      email?: string
      password?: string
      category?: string
      qaScore?: number | string
      quizScore?: number | string
      typingTestScore?: number | string
      foto?: string | File | null
    }
    let body: AgentBody
    let fotoUrl: string | null = null

    const contentType = request.headers.get('content-type')
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = {
        name: formData.get('name') as string | undefined,
        email: formData.get('email') as string | undefined,
        password: formData.get('password') as string | undefined,
        category: (formData.get('category') as string | undefined) || 'socialMedia',
        qaScore: formData.get('qaScore') as string | undefined,
        quizScore: formData.get('quizScore') as string | undefined,
        typingTestScore: formData.get('typingTestScore') as string | undefined,
        foto: formData.get('foto') as File | null
      }

      // Handle foto upload if provided as File
      const fotoFile = body.foto as File | null
      if (fotoFile && fotoFile instanceof File && fotoFile.size > 0) {
        const uploadResult = await uploadAgentPhotoServer(fotoFile, 'agents')
        if (uploadResult.error) {
          return NextResponse.json(
            { message: `Failed to upload foto: ${uploadResult.error}` },
            { status: 500 }
          )
        }
        fotoUrl = uploadResult.url
      } else if (typeof body.foto === 'string' && body.foto) {
        // If foto is provided as URL string
        fotoUrl = body.foto
      }
    } else {
      body = normalizeEmptyStrings(await request.json()) as {
        name?: string
        email?: string
        password?: string
        category?: string
        qaScore?: number
        quizScore?: number
        typingTestScore?: number
        foto?: string
      }
      fotoUrl = typeof body.foto === 'string' ? body.foto : null
    }

    const {
      name,
      email,
      password,
      category = 'socialMedia',
      qaScore = 0,
      quizScore = 0,
      typingTestScore = 0
    } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const prisma = createPrismaClient()
    
    // Check if agent already exists in database
    const existingAgent = await withRetry(() => prisma.agent.findUnique({
      where: { email: email.toLowerCase().trim() }
    }))

    if (existingAgent) {
      return NextResponse.json(
        { message: 'Agent with this email already exists' },
        { status: 409 }
      )
    }

    // Check if user already exists in Supabase Auth
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json(
        { message: 'Error checking existing users' },
        { status: 500 }
      )
    }

    console.log('Checking for existing user:', email.toLowerCase())
    console.log('Total users in Supabase Auth:', users.users.length)
    console.log('Existing emails:', users.users.map(u => u.email))

    const existingAuthUser = users.users.find(u => u.email?.toLowerCase().trim() === email.toLowerCase().trim())
    
    if (existingAuthUser) {
      console.log('Found existing user:', existingAuthUser.email)
      return NextResponse.json(
        { message: 'User with this email already exists in authentication system' },
        { status: 409 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'AGENT',
        category: category
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { message: 'Error creating user in authentication system' },
        { status: 500 }
      )
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Hash password before storing in database
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create agent profile in database
    const parseScore = (value: unknown) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const parsedQaScore = parseScore(qaScore)
    const parsedQuizScore = parseScore(quizScore)
    const parsedTypingScore = parseScore(typingTestScore)

    const newAgent = await withRetry(() => prisma.agent.create({
      data: {
        id: authData.user.id, // Use Supabase Auth user ID
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword, // Store hashed password
        foto: fotoUrl,
        category: category,
        isActive: true
      }
    }))

    // Create initial Performance record if scores are provided
    if (parsedQaScore > 0 || parsedQuizScore > 0 || parsedTypingScore > 0) {
      await withRetry(() => prisma.performance.create({
        data: {
          agentId: newAgent.id,
          qaScore: parsedQaScore,
          quizScore: parsedQuizScore,
          typingTestScore: parsedTypingScore,
          timestamp: new Date() // Save timestamp for initial score
        }
      }))
    }

    // Return success response
    return NextResponse.json(
      {
        message: 'Agent created successfully',
        agent: {
          id: newAgent.id,
          name: newAgent.name,
          email: newAgent.email,
          foto: newAgent.foto,
          category: newAgent.category,
          qaScore: parsedQaScore,
          quizScore: parsedQuizScore,
          typingTestScore: parsedTypingScore,
          afrt: 0,
          art: 0,
          rt: 0,
          rr: 0,
          csat: 0,
          isActive: newAgent.isActive,
          createdAt: newAgent.createdAt
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    // Prisma client is automatically managed by createPrismaClient
  }
}

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    // Build where clause with optimized search
    const where: PrismaWhere = {}

    if (search) {
      // Use startsWith for better performance on indexed fields
      where.OR = [
        { name: { startsWith: search, mode: 'insensitive' } },
        { email: { startsWith: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const prisma = createPrismaClient()
    
    // Get agents with pagination and optimized query
    const [agents, total] = await Promise.all([
      withRetry(() => prisma.agent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          foto: true,
          category: true,
          isActive: true,
          createdAt: true
        }
      })),
      withRetry(() => prisma.agent.count({ where }))
    ])

    // Optimize: Get latest performance for all agents in a single batch query
    const agentIds = agents.map(a => a.id)
    const performancesMap = new Map<string, {
      qaScore: number
      quizScore: number
      typingTestScore: number
      afrt: number
      art: number
      rt: number
      rr: number
      csat: number
    }>()
    
    if (agentIds.length > 0) {
      // Fetch all performances for these agents in one query, then filter to latest per agent
      const allPerformances = await withRetry(() => prisma.performance.findMany({
        where: { agentId: { in: agentIds } },
        orderBy: { timestamp: 'desc' },
        select: {
          agentId: true,
          qaScore: true,
          quizScore: true,
          typingTestScore: true,
          afrt: true,
          art: true,
          rt: true,
          rr: true,
          csat: true
        }
      }))

      // Group by agentId and take the first (latest) performance for each
      allPerformances.forEach(perf => {
        if (!performancesMap.has(perf.agentId)) {
          performancesMap.set(perf.agentId, {
            qaScore: perf.qaScore ?? 0,
            quizScore: perf.quizScore ?? 0,
            typingTestScore: perf.typingTestScore ?? 0,
            afrt: perf.afrt ?? 0,
            art: perf.art ?? 0,
            rt: perf.rt ?? 0,
            rr: perf.rr ?? 0,
            csat: perf.csat ?? 0
          })
        }
      })
    }

    // Map agents with their performance scores
    const agentsWithScores = agents.map(agent => {
      const performance = performancesMap.get(agent.id)
      return {
        ...agent,
        foto: agent.foto,
        qaScore: performance?.qaScore ?? 0,
        quizScore: performance?.quizScore ?? 0,
        typingTestScore: performance?.typingTestScore ?? 0,
        afrt: performance?.afrt ?? 0,
        art: performance?.art ?? 0,
        rt: performance?.rt ?? 0,
        rr: performance?.rr ?? 0,
        csat: performance?.csat ?? 0
      }
    })

    // Return agents
    return NextResponse.json({
      users: agentsWithScores, // Keep 'users' key for compatibility with frontend
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    // Prisma client is automatically managed by createPrismaClient
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    // Handle both JSON and FormData
    type UpdateAgentBody = {
      id?: string
      qaScore?: number | string
      quizScore?: number | string
      typingTestScore?: number | string
      afrt?: number | string
      art?: number | string
      rt?: number | string
      rr?: number | string
      csat?: number | string
      category?: string
      isActive?: boolean | string
      foto?: string | File | null
    }
    let body: UpdateAgentBody
    let fotoUrl: string | null | undefined = undefined

    const contentType = request.headers.get('content-type')
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = {
        id: formData.get('id') as string | undefined,
        qaScore: formData.get('qaScore') as string | undefined,
        quizScore: formData.get('quizScore') as string | undefined,
        typingTestScore: formData.get('typingTestScore') as string | undefined,
        afrt: formData.get('afrt') as string | undefined,
        art: formData.get('art') as string | undefined,
        rt: formData.get('rt') as string | undefined,
        rr: formData.get('rr') as string | undefined,
        csat: formData.get('csat') as string | undefined,
        category: formData.get('category') as string | undefined,
        isActive: formData.get('isActive') as string | undefined,
        foto: formData.get('foto') as File | null
      }
    } else {
      body = normalizeEmptyStrings(await request.json()) as {
        id?: string
        qaScore?: number
        quizScore?: number
        typingTestScore?: number
        afrt?: number
        art?: number
        rt?: number
        rr?: number
        csat?: number
        category?: string
        isActive?: boolean
        foto?: string | null
      }
    }

    const {
      id,
      qaScore,
      quizScore,
      typingTestScore,
      afrt,
      art,
      rt,
      rr,
      csat,
      category,
      isActive
    } = body

    if (!id) {
      return NextResponse.json(
        { message: 'Agent ID is required' },
        { status: 400 }
      )
    }

    const prisma = createPrismaClient()
    const existingAgent = await withRetry(() => prisma.agent.findUnique({ where: { id } }))

    if (!existingAgent) {
      return NextResponse.json(
        { message: 'Agent not found' },
        { status: 404 }
      )
    }

    // Handle foto upload if provided as File (after getting existingAgent)
    if (contentType?.includes('multipart/form-data')) {
      const fotoFile = body.foto as File | null
      if (fotoFile && fotoFile instanceof File && fotoFile.size > 0) {
        // Delete old foto if exists
        if (existingAgent.foto) {
          await deleteAgentPhotoServer(existingAgent.foto)
        }
        const uploadResult = await uploadAgentPhotoServer(fotoFile, 'agents')
        if (uploadResult.error) {
          return NextResponse.json(
            { message: `Failed to upload foto: ${uploadResult.error}` },
            { status: 500 }
          )
        }
        fotoUrl = uploadResult.url
      } else if (typeof body.foto === 'string') {
        // If foto is provided as URL string (or null to remove)
        fotoUrl = body.foto || null
      }
    } else {
      fotoUrl = typeof body.foto === 'string' ? body.foto : (body.foto === null ? null : undefined)
    }

    if (!existingAgent) {
      return NextResponse.json(
        { message: 'Agent not found' },
        { status: 404 }
      )
    }

    // Handle foto upload if provided as File (after getting existingAgent)
    // Note: fotoUrl already set above, but we need to handle file upload here
    if (contentType?.includes('multipart/form-data') && fotoUrl === undefined) {
      const fotoFile = body.foto as File | null
      if (fotoFile && fotoFile instanceof File && fotoFile.size > 0) {
        // Delete old foto if exists
        if (existingAgent.foto) {
          await deleteAgentPhotoServer(existingAgent.foto)
        }
        const uploadResult = await uploadAgentPhotoServer(fotoFile, 'agents')
        if (uploadResult.error) {
          return NextResponse.json(
            { message: `Failed to upload foto: ${uploadResult.error}` },
            { status: 500 }
          )
        }
        fotoUrl = uploadResult.url
      } else if (typeof body.foto === 'string') {
        // If foto is provided as URL string (or null to remove)
        fotoUrl = body.foto || null
      }
    } else if (!contentType?.includes('multipart/form-data')) {
      fotoUrl = typeof body.foto === 'string' ? body.foto : (body.foto === null ? null : undefined)
    }

    const parseScore = (value: unknown) => {
      if (value === null || value === undefined) return undefined
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    // Update Agent fields (category, isActive, foto)
    const updateAgentData: {
      category?: string
      isActive?: boolean
      foto?: string | null
    } = {}

    if (category) updateAgentData.category = category
    if (typeof isActive === 'boolean') updateAgentData.isActive = isActive
    if (fotoUrl !== undefined) {
      // If foto is being removed (null), delete old foto
      if (fotoUrl === null && existingAgent.foto) {
        await deleteAgentPhotoServer(existingAgent.foto)
      }
      // If foto is being replaced, delete old foto
      else if (fotoUrl && existingAgent.foto && existingAgent.foto !== fotoUrl) {
        await deleteAgentPhotoServer(existingAgent.foto)
      }
      updateAgentData.foto = fotoUrl
    }

    // Handle score updates - create or update Performance record
    const hasScoreUpdate =
      qaScore !== undefined ||
      quizScore !== undefined ||
      typingTestScore !== undefined ||
      afrt !== undefined ||
      art !== undefined ||
      rt !== undefined ||
      rr !== undefined ||
      csat !== undefined

    if (hasScoreUpdate) {
      const parsedQa = parseScore(qaScore)
      const parsedQuiz = parseScore(quizScore)
      const parsedTyping = parseScore(typingTestScore)
      const parsedAfrt = parseScore(afrt)
      const parsedArt = parseScore(art)
      const parsedRt = parseScore(rt)
      const parsedRr = parseScore(rr)
      const parsedCsat = parseScore(csat)

      // Get current date for checking same month
      const now = new Date()
      
      // Use raw SQL to find existing Performance record in the same month
      // Using date_trunc to compare only year-month, ignoring day and time
      const existingPerformance = await withRetry(async () => {
        const results = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id 
          FROM performances 
          WHERE agent_id = ${id}
            AND date_trunc('month', timestamp) = date_trunc('month', ${now}::timestamp)
          LIMIT 1
        `
        if (results && results.length > 0) {
          return results[0].id
        }
        return null
      })

      if (existingPerformance) {
        // Update existing record using Prisma (to handle updatedAt automatically)
        await withRetry(() => prisma.performance.update({
          where: { id: existingPerformance },
          data: {
            qaScore: parsedQa ?? 0,
            quizScore: parsedQuiz ?? 0,
            typingTestScore: parsedTyping ?? 0,
            afrt: parsedAfrt ?? 0,
            art: parsedArt ?? 0,
            rt: parsedRt ?? 0,
            rr: parsedRr ?? 0,
            csat: parsedCsat ?? 0,
            timestamp: now
          }
        }))
      } else {
        // Create new Performance record if no record exists in current month
        await withRetry(() => prisma.performance.create({
          data: {
            agentId: id,
            qaScore: parsedQa ?? 0,
            quizScore: parsedQuiz ?? 0,
            typingTestScore: parsedTyping ?? 0,
            afrt: parsedAfrt ?? 0,
            art: parsedArt ?? 0,
            rt: parsedRt ?? 0,
            rr: parsedRr ?? 0,
            csat: parsedCsat ?? 0,
            timestamp: now
          }
        }))
      }
    }

    // Update Agent if needed
    let updatedAgent: {
      id: string
      name: string
      email: string
      foto: string | null
      category: string
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    } = {
      id: existingAgent.id,
      name: existingAgent.name,
      email: existingAgent.email,
      foto: existingAgent.foto,
      category: existingAgent.category,
      isActive: existingAgent.isActive,
      createdAt: existingAgent.createdAt,
      updatedAt: existingAgent.updatedAt
    }

    if (Object.keys(updateAgentData).length > 0) {
      updatedAgent = await withRetry(() => prisma.agent.update({
        where: { id },
        data: updateAgentData,
        select: {
          id: true,
          name: true,
          email: true,
          foto: true,
          category: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }))
    }

    // Get latest performance for response
    const latestPerformance = await withRetry(() => prisma.performance.findFirst({
      where: { agentId: id },
      orderBy: { timestamp: 'desc' },
      select: {
        qaScore: true,
        quizScore: true,
        typingTestScore: true,
        afrt: true,
        art: true,
        rt: true,
        rr: true,
        csat: true,
        timestamp: true
      }
    }))

    return NextResponse.json({
      message: 'Agent updated successfully',
      agent: {
        ...updatedAgent,
        foto: updatedAgent.foto,
        qaScore: latestPerformance?.qaScore ?? 0,
        quizScore: latestPerformance?.quizScore ?? 0,
        typingTestScore: latestPerformance?.typingTestScore ?? 0,
        afrt: latestPerformance?.afrt ?? 0,
        art: latestPerformance?.art ?? 0,
        rt: latestPerformance?.rt ?? 0,
        rr: latestPerformance?.rr ?? 0,
        csat: latestPerformance?.csat ?? 0
      }
    })

  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('id')

    if (!agentId) {
      return NextResponse.json(
        { message: 'Agent ID is required' },
        { status: 400 }
      )
    }

    const prisma = createPrismaClient()
    
    // Check if agent exists in database
    const existingAgent = await withRetry(() => prisma.agent.findUnique({
      where: { id: agentId }
    }))

    if (!existingAgent) {
      return NextResponse.json(
        { message: 'Agent not found' },
        { status: 404 }
      )
    }

    // Delete user from Supabase Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(agentId)

    if (authDeleteError) {
      console.error('Error deleting user from Supabase Auth:', authDeleteError)
      return NextResponse.json(
        { message: 'Error deleting user from authentication system' },
        { status: 500 }
      )
    }

    // Delete agent foto from storage if exists
    if (existingAgent.foto) {
      await deleteAgentPhotoServer(existingAgent.foto)
    }

    // Delete agent from database
    await withRetry(() => prisma.agent.delete({
      where: { id: agentId }
    }))

    return NextResponse.json(
      { message: 'Agent deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting agent:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    // Prisma client is automatically managed by createPrismaClient
  }
}
