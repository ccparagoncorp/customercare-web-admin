import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import { normalizeEmptyStrings } from '@/lib/utils/normalize'
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

    const body = normalizeEmptyStrings(await request.json()) as {
      name?: string
      email?: string
      password?: string
      category?: string
      qaScore?: number
      quizScore?: number
      typingTestScore?: number
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
        category: category,
        isActive: true,
        qaScore: parsedQaScore,
        quizScore: parsedQuizScore,
        typingTestScore: parsedTypingScore
      }
    }))

    // Return success response
    return NextResponse.json(
      {
        message: 'Agent created successfully',
        agent: {
          id: newAgent.id,
          name: newAgent.name,
          email: newAgent.email,
          category: newAgent.category,
          qaScore: newAgent.qaScore,
          quizScore: newAgent.quizScore,
          typingTestScore: newAgent.typingTestScore,
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
          category: true,
          qaScore: true,
          quizScore: true,
          typingTestScore: true,
          isActive: true,
          createdAt: true
        }
      })),
      withRetry(() => prisma.agent.count({ where }))
    ])

    // Return agents
    return NextResponse.json({
      users: agents, // Keep 'users' key for compatibility with frontend
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

    const body = normalizeEmptyStrings(await request.json()) as {
      id?: string
      qaScore?: number
      quizScore?: number
      typingTestScore?: number
      category?: string
      isActive?: boolean
    }

    const { id, qaScore, quizScore, typingTestScore, category, isActive } = body

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

    const parseScore = (value: unknown) => {
      if (value === null || value === undefined) return undefined
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const updateData: {
      qaScore?: number
      quizScore?: number
      typingTestScore?: number
      category?: string
      isActive?: boolean
    } = {}

    const parsedQa = parseScore(qaScore)
    if (parsedQa !== undefined) updateData.qaScore = parsedQa

    const parsedQuiz = parseScore(quizScore)
    if (parsedQuiz !== undefined) updateData.quizScore = parsedQuiz

    const parsedTyping = parseScore(typingTestScore)
    if (parsedTyping !== undefined) updateData.typingTestScore = parsedTyping

    if (category) updateData.category = category
    if (typeof isActive === 'boolean') updateData.isActive = isActive

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updatedAgent = await withRetry(() => prisma.agent.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        category: true,
        qaScore: true,
        quizScore: true,
        typingTestScore: true,
        isActive: true,
        createdAt: true
      }
    }))

    return NextResponse.json({
      message: 'Agent updated successfully',
      agent: updatedAgent
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
