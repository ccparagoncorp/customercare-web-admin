'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Package, ArrowLeft, Filter, Search, Calendar, User, FileText, RefreshCw } from "lucide-react"

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

interface AuditLog {
  id: string
  sourceTable: string
  sourceKey: string
  fieldName: string
  oldValue: string | null
  newValue: string | null
  actionType: 'INSERT' | 'UPDATE' | 'DELETE'
  changedAt: string
  changedBy: string | null
}

function ProductTrackerContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filterAction, setFilterAction] = useState<'ALL' | 'INSERT' | 'UPDATE' | 'DELETE'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

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

    fetchLogs()
  }, [session, status, router, filterAction])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [filterAction, searchTerm])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        table: 'produks',
        limit: itemsPerPage.toString(),
      })

      if (filterAction !== 'ALL') {
        params.append('action', filterAction)
      }

      const response = await fetch(`/api/audit?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const truncateValue = (value: string | null, maxLength: number = 50) => {
    if (!value) return '-'
    if (value.length <= maxLength) return value
    return value.substring(0, maxLength) + '...'
  }

  // Group logs by change timestamp and sourceKey first
  const groupedLogs = logs.reduce((acc, log) => {
    const key = `${log.sourceKey}-${log.changedAt}`
    if (!acc[key]) {
      acc[key] = {
        sourceKey: log.sourceKey,
        changedAt: log.changedAt,
        actionType: log.actionType,
        changedBy: log.changedBy,
        changes: [],
      }
    }
    acc[key].changes.push({
      fieldName: log.fieldName,
      oldValue: log.oldValue,
      newValue: log.newValue,
    })
    return acc
  }, {} as Record<string, {
    sourceKey: string
    changedAt: string
    actionType: string
    changedBy: string | null
    changes: Array<{
      fieldName: string
      oldValue: string | null
      newValue: string | null
    }>
  }>)

  // Then filter grouped logs
  const filteredLogs = Object.values(groupedLogs).filter((group) => {
    if (filterAction !== 'ALL' && group.actionType !== filterAction) {
      return false
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        group.sourceKey.toLowerCase().includes(search) ||
        group.changes.some(change => 
          change.fieldName.toLowerCase().includes(search) ||
          (change.oldValue && change.oldValue.toLowerCase().includes(search)) ||
          (change.newValue && change.newValue.toLowerCase().includes(search))
        ) ||
        (group.changedBy && group.changedBy.toLowerCase().includes(search))
      )
    }
    return true
  })

  const groupedLogsArray = filteredLogs.sort((a, b) => {
    return new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  })

  // Pagination
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLogs = groupedLogsArray.slice(startIndex, endIndex)
  const totalPagesCalculated = Math.ceil(groupedLogsArray.length / itemsPerPage)

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/products')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold mb-2">Product Audit Log</h1>
                <p className="text-blue-100 text-lg">Riwayat perubahan data produk</p>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan ID, field, atau nilai..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value as 'ALL' | 'INSERT' | 'UPDATE' | 'DELETE')
                  setPage(1)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
              >
                <option value="ALL">Semua Aksi</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-4 py-2 bg-[#03438f] text-white rounded-lg hover:bg-[#012f65] transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg">Tidak ada audit log ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waktu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produk ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Perubahan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLogs.map((group, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(group.changedAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {group.sourceKey}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(group.actionType)}`}>
                          {group.actionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{group.changedBy || 'System'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-1 max-w-md">
                          {group.changes.map((change, changeIdx) => (
                            <div key={changeIdx} className="border-l-2 border-gray-200 pl-2">
                              <div className="font-medium text-gray-700">{change.fieldName}:</div>
                              {group.actionType === 'UPDATE' && (
                                <div className="text-xs space-y-1">
                                  <div className="text-red-600">
                                    <span className="font-medium">Old:</span> {truncateValue(change.oldValue)}
                                  </div>
                                  <div className="text-green-600">
                                    <span className="font-medium">New:</span> {truncateValue(change.newValue)}
                                  </div>
                                </div>
                              )}
                              {group.actionType === 'INSERT' && (
                                <div className="text-xs text-green-600">
                                  {truncateValue(change.newValue)}
                                </div>
                              )}
                              {group.actionType === 'DELETE' && (
                                <div className="text-xs text-red-600">
                                  {truncateValue(change.oldValue)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPagesCalculated > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, groupedLogsArray.length)} dari {groupedLogsArray.length} perubahan
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="px-4 py-2 text-sm font-medium text-gray-700">
                  Halaman {page} dari {totalPagesCalculated}
                </div>
                <button
                  onClick={() => setPage(Math.min(totalPagesCalculated, page + 1))}
                  disabled={page === totalPagesCalculated}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default function ProductTracker() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    }>
      <ProductTrackerContent />
    </Suspense>
  )
}

