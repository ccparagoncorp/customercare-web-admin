'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import { AnnouncementTable } from "@/components/admin/announcement/AnnouncementTable"
import { Megaphone } from "lucide-react"

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

export default function AnnouncementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    const user = session.user as UserWithRole
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
      router.push('/login')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Announcement</h1>
              <p className="text-blue-100 text-lg">Kelola pengumuman dan informasi penting</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Megaphone className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Announcement Table */}
        <AnnouncementTable />
      </div>
    </AdminLayout>
  )
}

