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

interface SessionUser {
  id: string
  role: string
  email?: string
  name?: string
  image?: string | null
}

interface SessionData {
  user: SessionUser
  expires: string
}

export const authOptions = {
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
    strategy: 'jwt' as const
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: any; user?: any }) {
      const typedToken = token as JWTToken
      if (user) {
        const typedUser = user as JWTUser
        typedToken.role = typedUser.role
      }
      return typedToken
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      const typedToken = token as JWTToken
      if (typedToken && session.user) {
        session.user.id = typedToken.sub || ''
        session.user.role = typedToken.role || ''
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
