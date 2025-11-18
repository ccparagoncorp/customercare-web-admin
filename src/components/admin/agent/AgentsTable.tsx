"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trash2, Eye, X, Pencil } from "lucide-react"
import { AddAgentModal } from "./AddAgentModal"
import { EditAgentModal } from "./EditAgentModal"
import agentsContent from "@/content/agents.json"

interface Agent {
  id: string
  name: string
  email: string
  role?: string
  category: string
  qaScore?: number
  quizScore?: number
  typingTestScore?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export function AgentsTable() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  const { table, addButton, searchPlaceholder } = agentsContent

  // Fetch agents data with caching
  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      })

      const response = await fetch(`/api/agents?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAgents(data.users || [])
        setPagination(prev => ({
          ...prev,
          ...data.pagination
        }))
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearchTerm])

  // Client-side filtering for better search experience
  const filteredAgents = agents.filter((agent) => {
    if (!debouncedSearchTerm.trim()) return true
    const searchLower = debouncedSearchTerm.toLowerCase()
    return (
      agent.name.toLowerCase().includes(searchLower) ||
      agent.email.toLowerCase().includes(searchLower) ||
      agent.category.toLowerCase().includes(searchLower)
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
    fetchAgents()
  }, [fetchAgents])

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

  const handleEditClick = (agent: Agent) => {
    setSelectedAgent(agent)
    setShowEditModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus agent ini?')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/agents?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        // Optimistic update - remove from local state immediately
        setAgents(prev => prev.filter(agent => agent.id !== id))
        setPagination(prev => ({ ...prev, total: prev.total - 1 }))
      } else {
        // If failed, refresh data
        fetchAgents()
      }
    } catch (error) {
      console.error('Error deleting agent:', error)
      fetchAgents() // Refresh on error
    } finally {
      setLoading(false)
    }
  }

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      socialMedia: { label: agentsContent.categories.socialMedia, color: 'bg-blue-100 text-blue-800' },
      eCommerce: { label: agentsContent.categories.eCommerce, color: 'bg-green-100 text-green-800' }
    }

    const config = categoryConfig[category as keyof typeof categoryConfig] || 
                  { label: category, color: 'bg-gray-100 text-gray-800' }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const renderScoreBadge = (value?: number) => {
    const score = typeof value === 'number' ? value : 0
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#03438f]/10 text-[#03438f]">
        {score.toFixed(0)}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            onClick={() => setShowAddModal(true)}
            className="bg-[#03438f] hover:bg-[#03438f]/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {addButton}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading && !filteredAgents.length ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {table.empty.title}
            </h3>
            <p className="text-gray-600 mb-4">{table.empty.description}</p>
            <Button
              onClick={() => setShowAddModal(true)}
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
                    {table.headers.name}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.email}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.category}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.status}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.qaScore}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.quizScore}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.typingScore}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {table.headers.actions}
                  </th>
                </tr>
              </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-[#03438f] flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {agent?.name?.split(' ').filter(Boolean).map(word => word[0].toUpperCase()).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {agent.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{agent.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCategoryBadge(agent.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {agent.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderScoreBadge(agent.qaScore)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderScoreBadge(agent.quizScore)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderScoreBadge(agent.typingTestScore)}
                </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(agent)}
                        className="text-[#03438f] hover:bg-[#03438f]/10"
                        disabled={loading}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(agent.id)}
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
              Menampilkan {((pagination.page - 1) * pagination.limit) + 1} sampai {Math.min(pagination.page * pagination.limit, filteredAgents.length)} dari {filteredAgents.length} agent
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

      {/* Add Agent Modal */}
      {showAddModal && (
        <AddAgentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newAgent) => {
            setShowAddModal(false)
            // Optimistic update - add to local state immediately
            if (newAgent) {
              const agentWithDefaults: Agent = {
                ...newAgent,
                qaScore: newAgent.qaScore ?? 0,
                quizScore: newAgent.quizScore ?? 0,
                typingTestScore: newAgent.typingTestScore ?? 0,
                isActive: newAgent.isActive ?? true
              }
              setAgents(prev => [agentWithDefaults, ...prev])
              setPagination(prev => ({ ...prev, total: prev.total + 1 }))
            }
          }}
        />
      )}
      {showEditModal && selectedAgent && (
        <EditAgentModal
          isOpen={showEditModal}
          agent={selectedAgent}
          onClose={() => {
            setShowEditModal(false)
            setSelectedAgent(null)
          }}
          onUpdated={(updatedAgent) => {
            setAgents(prev => prev.map(agent => agent.id === updatedAgent.id ? {
              ...agent,
              qaScore: updatedAgent.qaScore,
              quizScore: updatedAgent.quizScore,
              typingTestScore: updatedAgent.typingTestScore
            } : agent))
          }}
        />
      )}
    </div>
  )
}
