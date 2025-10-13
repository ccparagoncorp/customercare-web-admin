const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

const supabaseUrl = "https://dahjjvhffvuubxrzlafr.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaGpqdmhmZnZ1dWJ4cnpsYWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTcxNzk5NiwiZXhwIjoyMDc1MjkzOTk2fQ.3Lw8ACX01pPNEDRbLBdDSyt-nxF9a4jL9WnIQPuBzu8"

console.log('Environment check:')
console.log('URL:', supabaseUrl ? 'EXISTS' : 'MISSING')
console.log('KEY:', supabaseServiceKey ? 'EXISTS' : 'MISSING')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createSuperAdmin() {
  const email = "cckahf@gmail.com"
  const password = "Paragon2023"
  const name = "Admin CC Paragon"

  if (!email || !password || !name) {
    console.error('Missing super admin environment variables')
    process.exit(1)
  }

  try {
    // Create user in Supabase Auth
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
        isActive: true
      })
      .select()

    if (userError) {
      console.error('Error creating user profile:', userError)
      return
    }

    console.log('✅ User profile created:', userData[0])
    console.log('🎉 Super admin created successfully!')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

createSuperAdmin()
