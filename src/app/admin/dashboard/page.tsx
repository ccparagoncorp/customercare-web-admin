'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import dashboardContent from "@/content/dashboard.json"
import { Users, Ticket, BookOpen, Package, Activity, TrendingUp } from "lucide-react"

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

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

  // Don't block UI with session loading - show layout immediately
  if (!session && status !== 'loading') {
    return null
  }

  const { admin } = dashboardContent

  const stats = [
    {
      title: admin.stats.totalAgents,
      value: "24",
      icon: Users,
      change: "+12%",
      changeType: "positive"
    },
    {
      title: admin.stats.totalTickets,
      value: "1,234",
      icon: Ticket,
      change: "+8%",
      changeType: "positive"
    },
    {
      title: admin.stats.totalKnowledge,
      value: "156",
      icon: BookOpen,
      change: "+3%",
      changeType: "positive"
    },
    {
      title: admin.stats.totalProducts,
      value: "89",
      icon: Package,
      change: "-2%",
      changeType: "negative"
    }
  ]

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{admin.title}</h1>
              <p className="text-blue-100 text-lg">{admin.welcome}</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-[#03438f]/10 to-[#012f65]/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6 text-[#03438f]" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    stat.changeType === 'positive' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {stat.change}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">dari bulan lalu</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#03438f]/10 rounded-lg">
                  <Activity className="h-5 w-5 text-[#03438f]" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{admin.recentActivity}</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { action: "Agent baru ditambahkan", time: "2 jam yang lalu", type: "success" },
                  { action: "Knowledge base diperbarui", time: "4 jam yang lalu", type: "info" },
                  { action: "Tiket baru dibuat", time: "6 jam yang lalu", type: "warning" },
                  { action: "Produk baru ditambahkan", time: "1 hari yang lalu", type: "success" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${
                      item.type === 'success' ? 'bg-green-500' :
                      item.type === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.action}</p>
                      <p className="text-xs text-gray-500">{item.time}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {index === 0 ? '🆕' : index === 1 ? '📝' : index === 2 ? '🎫' : '📦'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#03438f]/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-[#03438f]" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{admin.quickActions}</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => router.push('/admin/agents')}
                  className="group p-4 text-left border border-gray-200 rounded-xl hover:border-[#03438f] hover:bg-gradient-to-br hover:from-[#03438f]/5 hover:to-[#012f65]/5 transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[#03438f]/10 rounded-lg group-hover:bg-[#03438f]/20 transition-colors">
                      <Users className="h-5 w-5 text-[#03438f]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tambah Agent</p>
                      <p className="text-xs text-gray-500">Kelola agent baru</p>
                    </div>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/admin/knowledge')}
                  className="group p-4 text-left border border-gray-200 rounded-xl hover:border-[#03438f] hover:bg-gradient-to-br hover:from-[#03438f]/5 hover:to-[#012f65]/5 transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[#03438f]/10 rounded-lg group-hover:bg-[#03438f]/20 transition-colors">
                      <BookOpen className="h-5 w-5 text-[#03438f]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tambah Knowledge</p>
                      <p className="text-xs text-gray-500">Update knowledge base</p>
                    </div>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/admin/products')}
                  className="group p-4 text-left border border-gray-200 rounded-xl hover:border-[#03438f] hover:bg-gradient-to-br hover:from-[#03438f]/5 hover:to-[#012f65]/5 transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[#03438f]/10 rounded-lg group-hover:bg-[#03438f]/20 transition-colors">
                      <Package className="h-5 w-5 text-[#03438f]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tambah Produk</p>
                      <p className="text-xs text-gray-500">Kelola produk baru</p>
                    </div>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/admin/sop')}
                  className="group p-4 text-left border border-gray-200 rounded-xl hover:border-[#03438f] hover:bg-gradient-to-br hover:from-[#03438f]/5 hover:to-[#012f65]/5 transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[#03438f]/10 rounded-lg group-hover:bg-[#03438f]/20 transition-colors">
                      <TrendingUp className="h-5 w-5 text-[#03438f]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Lihat Laporan</p>
                      <p className="text-xs text-gray-500">Analisis performa</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}