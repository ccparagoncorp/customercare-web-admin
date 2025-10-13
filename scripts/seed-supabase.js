const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Environment check:')
console.log('URL:', supabaseUrl ? 'EXISTS' : 'MISSING')
console.log('KEY:', supabaseServiceKey ? 'EXISTS' : 'MISSING')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedSupabase() {
  const email = process.env.SUPER_ADMIN_EMAIL || "cckahf@gmail.com"
  const password = process.env.SUPER_ADMIN_PASSWORD || "Paragon2023"
  const name = process.env.SUPER_ADMIN_NAME || "Admin CC Paragon"

  console.log('Starting Supabase seed...')
  console.log('Email:', email)
  console.log('Name:', name)

  try {
    // Check if user already exists in auth.users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return
    }

    const existingUser = users.users.find(u => u.email === email)
    
    if (existingUser) {
      console.log('✅ User already exists in Supabase Auth:')
      console.log('ID:', existingUser.id)
      console.log('Email:', existingUser.email)
      
      // Check if profile exists in public.users
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', existingUser.id)
        .single()

      if (profileError) {
        console.log('Creating user profile in public.users...')
        
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: existingUser.id,
            email: existingUser.email,
            name: name,
            role: 'SUPER_ADMIN',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .select()

        if (createError) {
          console.error('Error creating profile:', createError)
        } else {
          console.log('✅ User profile created:', newProfile[0])
        }
      } else {
        console.log('✅ User profile already exists:', profile)
      }
      
      return
    }

    // Create new user in Supabase Auth
    console.log('Creating new user in Supabase Auth...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
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

    // Create user profile in public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()

    if (userError) {
      console.error('Error creating user profile:', userError)
      return
    }

    console.log('✅ User profile created:', userData[0])
    console.log('🎉 Super admin seeded successfully!')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

seedSupabase()
