"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trash2, X, BookOpen, Pencil } from "lucide-react"
// AddKnowledgeModal removed; use dedicated pages instead
import knowledgeContent from "@/content/knowledge.json"

interface Knowledge {
  id: string
  title: string
  description: string
  logos?: string[]
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  updatedBy?: string | null
  detailKnowledges: DetailKnowledge[]
}

interface DetailKnowledge {
  id: string
  name: string
  description?: string
  logos?: string[]
}

export function KnowledgeTable() {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  // const [showAddModal, setShowAddModal] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  const { table, addButton, searchPlaceholder } = knowledgeContent

  // Fetch knowledge data with caching
  const fetchKnowledge = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      })

      const response = await fetch(`/api/knowledge?${params}`)
      if (response.ok) {
        const data = await response.json()
        setKnowledge(data.knowledge || [])
        setPagination(prev => ({
          ...prev,
          ...data.pagination
        }))
      }
    } catch (error) {
      console.error('Error fetching knowledge:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearchTerm])

  // Client-side filtering for better search experience
  const filteredKnowledge = knowledge.filter((item) => {
    if (!debouncedSearchTerm.trim()) return true
    const searchLower = debouncedSearchTerm.toLowerCase()
    return (
      item.title.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      item.detailKnowledges.some(detail => 
        detail.name.toLowerCase().includes(searchLower) ||
        (detail.description && detail.description.toLowerCase().includes(searchLower))
      )
    )
  })

  // Debounce search term - only search after user stops typing for 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 1000) // 1 second delay - only search when user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchKnowledge()
  }, [fetchKnowledge])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setDebouncedSearchTerm(searchTerm)
    }
  }


  const handleClearSearch = () => {
    setSearchTerm("")
    setDebouncedSearchTerm("")
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus knowledge ini?')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/knowledge?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        // Optimistic update - remove from local state immediately
        setKnowledge(prev => prev.filter(item => item.id !== id))
        setPagination(prev => ({ ...prev, total: prev.total - 1 }))
      } else {
        // If failed, refresh data
        fetchKnowledge()
      }
    } catch (error) {
      console.error('Error deleting knowledge:', error)
      fetchKnowledge() // Refresh on error
    } finally {
      setLoading(false)
    }
  }

  const getDetailCount = (details: DetailKnowledge[]) => {
    return details.length
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          <Button
            onClick={() => window.location.assign('/admin/knowledge/new')}
            className="bg-[#03438f] hover:bg-[#03438f]/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {addButton}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading && !filteredKnowledge.length ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
          </div>
        ) : filteredKnowledge.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {table.empty.title}
            </h3>
            <p className="text-gray-600 mb-4">{table.empty.description}</p>
            <Button
              onClick={() => window.location.assign('/admin/knowledge/new')}
              className="bg-[#03438f] hover:bg-[#03438f]/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {table.empty.button}
            </Button>
          </div>
        ) : (
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
              </div>
            )}
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.title}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.description}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.details}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diupdate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat oleh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diupdate oleh</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredKnowledge.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {item.logos && item.logos.length ? (
                            <Image
                              src={item.logos[0]}
                              alt={item.title}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-[#03438f] flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        <div className="line-clamp-3 whitespace-pre-line">
                          {item.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getDetailCount(item.detailKnowledges)} Detail
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.createdAt).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.updatedAt && item.updatedAt !== item.createdAt ? new Date(item.updatedAt).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.createdBy || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.updatedBy || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.assign(`/admin/knowledge/${item.id}/edit`)}
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Menampilkan {((pagination.page - 1) * pagination.limit) + 1} sampai {Math.min(pagination.page * pagination.limit, filteredKnowledge.length)} dari {filteredKnowledge.length} knowledge
              {debouncedSearchTerm && ` (dari ${pagination.total} total)`}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal removed */}
    </div>
  )
}
