"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import { AgentsTable } from "@/components/admin/AgentsTable"
import { Users, UserCheck, Clock, TrendingUp } from "lucide-react"
import agentsContent from "@/content/agents.json"

export default function AgentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [statsData, setStatsData] = useState([
    {
      title: agentsContent.stats.totalAgents,
      value: "0",
      icon: Users,
      change: "+0",
      changeType: "positive"
    },
    {
      title: agentsContent.stats.totalSocMed,
      value: "0",
      icon: UserCheck,
      change: "+0",
      changeType: "positive"
    },
    {
      title: agentsContent.stats.totalECom,
      value: "0",
      icon: Clock,
      change: "0",
      changeType: "positive"
    }
  ])

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
      router.push('/login')
      return
    }
  }, [session, status, router])

  // Fetch stats data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/agents')
        if (response.ok) {
          const data = await response.json()
          const agents = data.users || []
          
          const totalAgents = agents.length
          const totalSocMed = agents.filter((agent: any) => agent.category === 'socialMedia').length
          const totalECom = agents.filter((agent: any) => agent.category === 'eCommerce').length
          
          setStatsData([
            {
              title: agentsContent.stats.totalAgents,
              value: totalAgents.toString(),
              icon: Users,
              change: "+0",
              changeType: "positive"
            },
            {
              title: agentsContent.stats.totalSocMed,
              value: totalSocMed.toString(),
              icon: UserCheck,
              change: "+0",
              changeType: "positive"
            },
            {
              title: agentsContent.stats.totalECom,
              value: totalECom.toString(),
              icon: Clock,
              change: "0",
              changeType: "positive"
            }
          ])
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    if (session && (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN')) {
      fetchStats()
    }
  }, [session])

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
              <h1 className="text-3xl font-bold mb-2">{agentsContent.title}</h1>
              <p className="text-blue-100 text-lg">{agentsContent.description}</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsData.map((stat, index) => {
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
                  <p className="text-xs text-gray-500 mt-1">dari kemarin</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Agents Table */}
        <AgentsTable />
      </div>
    </AdminLayout>
  )
}
