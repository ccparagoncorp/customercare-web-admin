"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddAgentModal } from "./AddAgentModal"
import { 
  Search, 
  Edit, 
  Trash2, 
  UserCheck, 
  MessageSquare
} from "lucide-react"
import agentsContent from "@/content/agents.json"

export function AgentsTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [agents, setAgents] = useState<any[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { table } = agentsContent

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  )


  // Fetch agents from API
  const fetchAgents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/agents')
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents')
      }
      
      const data = await response.json()
      setAgents(data.users || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const handleAddAgentSuccess = () => {
    // Refresh agents list after adding new agent
    fetchAgents()
    setIsAddModalOpen(false)
    console.log('Agent added successfully!')
  }

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus agent "${agentName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/agents?id=${agentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete agent')
      }

      // Refresh agents list after deletion
      fetchAgents()
      console.log('Agent deleted successfully!')
    } catch (error) {
      console.error('Error deleting agent:', error)
      alert('Gagal menghapus agent. Silakan coba lagi.')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{agentsContent.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{agentsContent.description}</p>
          </div>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#03438f] hover:bg-[#012f65] text-white px-6 py-2"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            {agentsContent.addButton}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-6 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder={agentsContent.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full max-w-md"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data agents...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{table.empty.title}</h3>
            <p className="text-gray-600 mb-6">{table.empty.description}</p>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#03438f] hover:bg-[#012f65] text-white"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {table.empty.button}
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {table.headers.name}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {table.headers.email}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {table.headers.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#03438f]/20 to-[#012f65]/20 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-[#03438f]">
                          {agent.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                        <div className="text-sm text-gray-500">{agent.category === 'socialMedia' ? 'Social Media' : 'E-Commerce'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{agent.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-[#03438f] hover:bg-[#03438f]/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                             <Button
                               variant="ghost"
                               size="sm"
                               className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                               onClick={() => handleDeleteAgent(agent.id, agent.name)}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {filteredAgents.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Menampilkan <span className="font-medium">1</span> sampai <span className="font-medium">{filteredAgents.length}</span> dari <span className="font-medium">{agents.length}</span> agent
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" className="bg-[#03438f] text-white border-[#03438f]">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                Selanjutnya
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      <AddAgentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddAgentSuccess}
      />
    </div>
  )
}
