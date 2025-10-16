// NextAuth type declarations

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
  }
}
