import CredentialsProvider from 'next-auth/providers/credentials'
import { supabaseAdmin } from './supabase'

interface JWTToken {
  sub?: string
  role?: string
  [key: string]: unknown
}

interface JWTUser {
  id: string
  email: string
  name: string
  role: string
}

// Determine if we should use secure cookies
// Secure cookies required for HTTPS in production
const shouldUseSecureCookies = () => {
  // In production, always use secure if NEXTAUTH_URL is HTTPS
  if (process.env.NODE_ENV === 'production') {
    const url = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    return url?.startsWith('https://') || false
  }
  // In development, never use secure (localhost is HTTP)
  return false
}

// Validate NEXTAUTH_SECRET
const getNextAuthSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET
  
  // If secret is not set, use a consistent fallback for development
  // This allows the app to work, but user should set a proper secret
  if (!secret || secret.trim() === '' || secret === 'default-secret-change-in-production') {
    if (process.env.NODE_ENV === 'development') {
      // Use a consistent fallback secret for development
      // WARNING: This should be replaced with a proper secret
      console.warn('⚠️  NEXTAUTH_SECRET is not set!')
      console.warn('⚠️  Using fallback secret. Please set NEXTAUTH_SECRET in .env file')
      console.warn('⚠️  Generate one with: openssl rand -base64 32')
      return 'dev-secret-key-min-32-chars-please-set-nextauth-secret-in-env-file-for-production'
    } else {
      // In production, throw error if secret is not set
      throw new Error('NEXTAUTH_SECRET is required in production environment!')
    }
  }
  
  return secret
}

export const authOptions = {
  secret: getNextAuthSecret(),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Try Supabase authentication first
          const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error || !data.user) {
            console.log('Supabase auth failed, trying local fallback')
            
            // Fallback: Check against hardcoded super admin
            if (credentials.email === process.env.SUPER_ADMIN_EMAIL && 
                credentials.password === process.env.SUPER_ADMIN_PASSWORD) {
              return {
                id: 'super-admin',
                email: credentials.email,
                name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
                role: 'SUPER_ADMIN'
              }
            }
            
            return null
          }

          // Get user metadata from Supabase
          const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (userError || !userData || !userData.isActive) {
            return null
          }

          return {
            id: data.user.id,
            email: data.user.email!,
            name: userData.name,
            role: userData.role
          }
        } catch (error) {
          console.error('Supabase connection error, using local fallback:', error instanceof Error ? error.message : 'Unknown error')
          
          // Fallback: Check against hardcoded super admin
          if (credentials.email === process.env.SUPER_ADMIN_EMAIL && 
              credentials.password === process.env.SUPER_ADMIN_PASSWORD) {
            return {
              id: 'super-admin',
              email: credentials.email,
              name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
              role: 'SUPER_ADMIN'
            }
          }
          
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // Only set secure to true if using HTTPS
        // Development: false (HTTP localhost)
        // Production: true only if using HTTPS
        secure: shouldUseSecureCookies(),
      },
    },
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: any; user?: any }) {
      const typedToken = token as JWTToken
      if (user) {
        const typedUser = user as JWTUser
        typedToken.sub = typedUser.id
        typedToken.role = typedUser.role
        typedToken.email = typedUser.email
        typedToken.name = typedUser.name
      }
      return typedToken
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      const typedToken = token as JWTToken
      if (typedToken && session.user) {
        session.user.id = typedToken.sub || ''
        session.user.role = typedToken.role || ''
        if (typedToken.email) session.user.email = typedToken.email as string
        if (typedToken.name) session.user.name = typedToken.name as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}

interface RequestWithSession {
  session?: {
    user?: {
      role?: string
    }
  }
}

interface Response {
  status: (code: number) => Response
  json: (data: { message: string }) => void
}

type NextFunction = () => void

export function requireRole(role: string) {
  return (req: RequestWithSession, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const userRole = req.session.user.role
    
    if (role === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (role === 'ADMIN' && !['SUPER_ADMIN', 'ADMIN'].includes(userRole || '')) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    next()
  }
}
