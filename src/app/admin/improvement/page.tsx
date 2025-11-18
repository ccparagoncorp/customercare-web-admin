'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import { FileText } from "lucide-react"

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

export default function ImprovementPage() {
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

  // Google Sheets embed URL - format view dengan parameter untuk mengurangi permintaan akses
  // Menggunakan NEXT_PUBLIC_ karena ini client component
  const spreadsheetId = process.env.NEXT_PUBLIC_SPREADSHEET_IMPROVEMENT_ID
  const spreadsheetIdPublic = process.env.NEXT_PUBLIC_SPREADSHEET_PUBLIC_ID
  const gid = '0'
  // Menggunakan format view dengan rm=minimal dan usp=sharing untuk mengurangi permintaan akses
  const embedUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
  const embedUrlPublic = `https://docs.google.com/spreadsheets/d/${spreadsheetIdPublic}`
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Feedback</h1>
              <p className="text-blue-100 text-lg">Lihat dan kelola feedback</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Spreadsheet Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#03438f]/10 rounded-lg">
                  <FileText className="h-5 w-5 text-[#03438f]" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Feedback Improvement Spreadsheet</h2>
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${gid}#gid=${gid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#03438f] text-white rounded-lg hover:bg-[#012f65] transition-colors text-sm font-medium"
              >
                Buka di Google Sheets
              </a>
            </div>
          </div>
          <div className="p-6">
            <div className="w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
              <iframe
                src={embedUrl}
                className="w-full h-full border-0 rounded-lg"
                style={{ minHeight: '600px' }}
                title="Feedback Improvement Spreadsheet"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>

        {/* Spreadsheet Container Public*/}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#03438f]/10 rounded-lg">
                  <FileText className="h-5 w-5 text-[#03438f]" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Feedback Improvement Spreadsheet</h2>
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetIdPublic}/edit?gid=${gid}#gid=${gid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#03438f] text-white rounded-lg hover:bg-[#012f65] transition-colors text-sm font-medium"
              >
                Buka di Google Sheets
              </a>
            </div>
          </div>
          <div className="p-6">
            <div className="w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
              <iframe
                src={embedUrlPublic}
                className="w-full h-full border-0 rounded-lg"
                style={{ minHeight: '600px' }}
                title="Feedback Improvement Spreadsheet"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

