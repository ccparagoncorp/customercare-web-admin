import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // If user is authenticated and tries to access login page, redirect to dashboard
    if (req.nextUrl.pathname === '/login' && req.nextauth.token) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }
    
    // For all other cases, let withAuth handle it
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page without authentication
        if (req.nextUrl.pathname === '/login') {
          return true
        }

        // Require authentication for admin routes
        if (req.nextUrl.pathname.startsWith('/admin')) {
          // Token must exist for admin routes
          return !!token
        }

        // Allow other routes
        return true
      }
    },
    pages: {
      signIn: '/login'
    }
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/login'
  ]
}
