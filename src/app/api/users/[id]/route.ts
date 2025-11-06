import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createPrismaClient, withRetry } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'

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

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const prisma = createPrismaClient()
    const userData = await withRetry(() => prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    }))

    if (!userData) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user
    if (sessionUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { email, name, password, role, isActive } = await request.json()

    const prisma = createPrismaClient()
    
    // Check if user exists
    const existingUser = await withRetry(() => prisma.user.findUnique({
      where: { id: params.id }
    }))

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingUser.email) {
      const emailTaken = await withRetry(() => prisma.user.findUnique({
        where: { email }
      }))

      if (emailTaken) {
        return NextResponse.json({ message: 'Email already taken' }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput & { password?: string } = {}
    if (email) updateData.email = email
    if (name) updateData.name = name
    if (role) updateData.role = role
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const user = await withRetry(() => prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    }))

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const prisma = createPrismaClient()
    
    // Check if user exists
    const existingUser = await withRetry(() => prisma.user.findUnique({
      where: { id: params.id }
    }))

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Don't allow deleting super admin
    if (existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Cannot delete super admin' }, { status: 400 })
    }

    await withRetry(() => prisma.user.delete({
      where: { id: params.id }
    }))

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
