import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient, UserRole } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or super admin
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, password, role = 'AGENT', category = 'socialMedia' } = body

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

    // Check if agent already exists in database
    const existingAgent = await prisma.agent.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

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
    const newAgent = await prisma.agent.create({
      data: {
        id: authData.user.id, // Use Supabase Auth user ID
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword, // Store hashed password
        category: category,
        isActive: true
      }
    })

    // Return success response
    return NextResponse.json(
      {
        message: 'Agent created successfully',
        agent: {
          id: newAgent.id,
          name: newAgent.name,
          email: newAgent.email,
          category: newAgent.category,
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
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or super admin
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
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

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get agents with pagination
    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.agent.count({ where })
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
    await prisma.$disconnect()
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
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

  try {
    // Check if agent exists in database
    const existingAgent = await prisma.agent.findUnique({
      where: { id: agentId }
    })

    if (!existingAgent) {
      return NextResponse.json(
        { message: 'Agent not found' },
        { status: 404 }
      )
    }

    console.log('Deleting agent:', existingAgent.email)

    // Delete user from Supabase Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(agentId)

    if (authDeleteError) {
      console.error('Error deleting user from Supabase Auth:', authDeleteError)
      return NextResponse.json(
        { message: 'Error deleting user from authentication system' },
        { status: 500 }
      )
    }

    console.log('✅ User deleted from Supabase Auth')

    // Delete agent from database
    await prisma.agent.delete({
      where: { id: agentId }
    })

    console.log('✅ Agent deleted from database')

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
  }
}
