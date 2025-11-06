'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session || !session.user) {
      router.push('/login')
      return
    }

    const user = session.user as UserWithRole
    // Redirect based on role
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      router.push('/admin/dashboard')
    } else {
      router.push('/agent/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    )
  }

  return null
}
