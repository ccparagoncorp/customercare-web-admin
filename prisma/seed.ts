import { PrismaClient, UserRole } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

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

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "cckahf@gmail.com"
  const password = process.env.SUPER_ADMIN_PASSWORD || "Paragon2023"
  const name = process.env.SUPER_ADMIN_NAME || "Admin CC Paragon" 

  console.log('Starting super admin seed with Supabase Auth...')
  console.log('Email:', email)
  console.log('Name:', name)

  try {
    // Check if user already exists in Supabase Auth
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return
    }

    const existingAuthUser = users.users.find(u => u.email === email)
    
    if (existingAuthUser) {
      console.log('✅ User already exists in Supabase Auth:', existingAuthUser.id)
      
      // Check if profile exists in database
      const existingProfile = await prisma.user.findUnique({
        where: { email: email }
      })

      if (existingProfile) {
        console.log('✅ User profile already exists in database:', existingProfile.id)
        return
      }

      // Create profile in database if auth user exists but no profile
      console.log('Creating user profile in database...')
      const profile = await prisma.user.create({
        data: {
          id: existingAuthUser.id,
          email: email,
          name: name,
          role: UserRole.SUPER_ADMIN,
          isActive: true
        }
      })

      console.log('✅ User profile created in database:', profile)
      return
    }

    // Create new user in Supabase Auth
    console.log('Creating new user in Supabase Auth...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'SUPER_ADMIN'
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Create user profile in database
    const superAdmin = await prisma.user.create({
      data: {
        id: authData.user.id,
        email: email,
        name: name,
        role: UserRole.SUPER_ADMIN,
        isActive: true
      }
    })

    console.log('✅ Super admin created successfully:', {
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: superAdmin.role
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
