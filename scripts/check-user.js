const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = "https://dahjjvhffvuubxrzlafr.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaGpqdmhmZnZ1dWJ4cnpsYWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTcxNzk5NiwiZXhwIjoyMDc1MjkzOTk2fQ.3Lw8ACX01pPNEDRbLBdDSyt-nxF9a4jL9WnIQPuBzu8"

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkUser() {
  const email = "cckahf@gmail.com"
  
  try {
    // Check if user exists in auth.users
    const { data: users, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    const user = users.users.find(u => u.email === email)
    
    if (user) {
      console.log('✅ User found in Supabase Auth:')
      console.log('ID:', user.id)
      console.log('Email:', user.email)
      console.log('Confirmed:', user.email_confirmed_at ? 'Yes' : 'No')
      console.log('Created:', user.created_at)
    } else {
      console.log('❌ User NOT found in Supabase Auth')
      console.log('Total users in auth:', users.users.length)
    }

    // Check if user profile exists in public.users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError) {
      console.log('❌ User profile NOT found in public.users table')
    } else {
      console.log('✅ User profile found in public.users:')
      console.log('ID:', profile.id)
      console.log('Name:', profile.name)
      console.log('Role:', profile.role)
      console.log('Active:', profile.isActive)
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkUser()
