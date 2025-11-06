'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import sopContent from "@/content/sop.json"
import { FileText, FolderTree, FileCheck, Plus, Edit, Trash2, Search, X, LucideIcon } from "lucide-react"

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

interface KategoriSOP {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface SOP {
  id: string
  name: string
  description?: string
  kategoriSOP: KategoriSOP
  createdAt: string
  updatedAt: string
}

interface JenisSOP {
  id: string
  name: string
  content?: string
  images: string[]
  sop: SOP
  createdBy?: string
  updatedBy?: string
  updateNotes?: string
  createdAt: string
  updatedAt: string
}

export default function SOPManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'kategoriSOP' | 'namaSOP' | 'jenisSOP'>('kategoriSOP')
  const [kategoriSOPs, setKategoriSOPs] = useState<KategoriSOP[]>([])
  const [sops, setSOPs] = useState<SOP[]>([])
  const [jenisSOPs, setJenisSOPs] = useState<JenisSOP[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // Search and filter states
  const [kategoriSOPSearch, setKategoriSOPSearch] = useState('')
  const [namaSOPSearch, setNamaSOPSearch] = useState('')
  const [jenisSOPSearch, setJenisSOPSearch] = useState('')
  const [namaSOPKategoriFilter, setNamaSOPKategoriFilter] = useState('')
  const [jenisSOPSOPFilter, setJenisSOPSOPFilter] = useState('')
  const [jenisSOPKategoriFilter, setJenisSOPKategoriFilter] = useState('')

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

    // Set active tab from URL parameter
    const tab = searchParams.get('tab')
    if (tab && ['kategoriSOP', 'namaSOP', 'jenisSOP'].includes(tab)) {
      setActiveTab(tab as 'kategoriSOP' | 'namaSOP' | 'jenisSOP')
    }

    // Only fetch data once when component mounts
    if (!dataLoaded) {
      fetchData()
    }
  }, [session, status, router, dataLoaded, searchParams])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [kategoriSOPRes, sopRes, jenisSOPRes] = await Promise.all([
        fetch('/api/kategori-sop'),
        fetch('/api/sop'),
        fetch('/api/jenis-sop')
      ])

      if (kategoriSOPRes.ok) {
        const kategoriSOPData = await kategoriSOPRes.json()
        setKategoriSOPs(kategoriSOPData)
      }

      if (sopRes.ok) {
        const sopData = await sopRes.json()
        setSOPs(sopData)
      }

      if (jenisSOPRes.ok) {
        const jenisSOPData = await jenisSOPRes.json()
        setJenisSOPs(jenisSOPData)
      }
      
      setDataLoaded(true)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter functions
  const filteredKategoriSOPs = kategoriSOPs.filter(kategoriSOP => 
    kategoriSOP.name.toLowerCase().includes(kategoriSOPSearch.toLowerCase()) ||
    (kategoriSOP.description && kategoriSOP.description.toLowerCase().includes(kategoriSOPSearch.toLowerCase()))
  )

  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = sop.name.toLowerCase().includes(namaSOPSearch.toLowerCase()) ||
      (sop.description && sop.description.toLowerCase().includes(namaSOPSearch.toLowerCase()))
    const matchesKategori = !namaSOPKategoriFilter || sop.kategoriSOP.id === namaSOPKategoriFilter
    return matchesSearch && matchesKategori
  })

  const filteredJenisSOPs = jenisSOPs.filter(jenisSOP => {
    const matchesSearch = jenisSOP.name.toLowerCase().includes(jenisSOPSearch.toLowerCase()) ||
      (jenisSOP.content && jenisSOP.content.toLowerCase().includes(jenisSOPSearch.toLowerCase()))
    const matchesSOP = !jenisSOPSOPFilter || jenisSOP.sop.id === jenisSOPSOPFilter
    const matchesKategori = !jenisSOPKategoriFilter || jenisSOP.sop.kategoriSOP.id === jenisSOPKategoriFilter
    return matchesSearch && matchesSOP && matchesKategori
  })

  const handleDeleteKategoriSOP = async (id: string) => {
    if (!confirm(sopContent.messages.confirmDelete)) return

    try {
      const response = await fetch(`/api/kategori-sop/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setKategoriSOPs(kategoriSOPs.filter(kategoriSOP => kategoriSOP.id !== id))
        alert(sopContent.messages.itemDeleted)
      } else {
        const error = await response.json()
        alert(error.error || 'Error deleting kategori SOP')
      }
    } catch (error) {
      console.error('Error deleting kategori SOP:', error)
      alert('Error deleting kategori SOP')
    }
  }

  const handleDeleteSOP = async (id: string) => {
    if (!confirm(sopContent.messages.confirmDelete)) return

    try {
      const response = await fetch(`/api/sop/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSOPs(sops.filter(sop => sop.id !== id))
        alert(sopContent.messages.itemDeleted)
      } else {
        const error = await response.json()
        alert(error.error || 'Error deleting SOP')
      }
    } catch (error) {
      console.error('Error deleting SOP:', error)
      alert('Error deleting SOP')
    }
  }

  const handleDeleteJenisSOP = async (id: string) => {
    if (!confirm(sopContent.messages.confirmDelete)) return

    try {
      const response = await fetch(`/api/jenis-sop/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setJenisSOPs(jenisSOPs.filter(jenisSOP => jenisSOP.id !== id))
        alert(sopContent.messages.itemDeleted)
      } else {
        const error = await response.json()
        alert(error.error || 'Error deleting Jenis SOP')
      }
    } catch (error) {
      console.error('Error deleting Jenis SOP:', error)
      alert('Error deleting Jenis SOP')
    }
  }

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
              <h1 className="text-3xl font-bold mb-2">{sopContent.title}</h1>
              <p className="text-blue-100 text-lg">Kelola data SOP</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-6">
              {([
                { id: 'kategoriSOP' as const, label: 'Kategori SOP', icon: FolderTree },
                { id: 'namaSOP' as const, label: 'Nama SOP', icon: FileCheck },
                { id: 'jenisSOP' as const, label: 'Jenis SOP', icon: FileText }
              ] as Array<{ id: 'kategoriSOP' | 'namaSOP' | 'jenisSOP', label: string, icon: LucideIcon }>).map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#03438f] text-[#03438f]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Kategori SOP Section */}
            {activeTab === 'kategoriSOP' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Kategori SOP</h2>
                    <p className="text-gray-600">Kelola kategori SOP</p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/sop/kategori-sop/new')}
                    className="flex items-center space-x-2 bg-[#03438f] text-white px-4 py-2 rounded-lg hover:bg-[#012f65] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{sopContent.actions.add} Kategori SOP</span>
                  </button>
                </div>

                {/* Search */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari kategori SOP..."
                        value={kategoriSOPSearch}
                        onChange={(e) => setKategoriSOPSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      />
                    </div>
                  </div>
                  {kategoriSOPSearch && (
                    <button
                      onClick={() => setKategoriSOPSearch('')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : kategoriSOPs.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada data kategori SOP</p>
                  </div>
                ) : filteredKategoriSOPs.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada kategori SOP yang sesuai dengan pencarian</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nama
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deskripsi
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dibuat
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Diupdate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredKategoriSOPs.map((kategoriSOP) => (
                          <tr key={kategoriSOP.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{kategoriSOP.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500">{kategoriSOP.description ? kategoriSOP.description.substring(0, 50) + (kategoriSOP.description.length > 50 ? '...' : '') : '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(kategoriSOP.createdAt).toLocaleString('id-ID', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {kategoriSOP.updatedAt && kategoriSOP.updatedAt !== kategoriSOP.createdAt 
                                ? new Date(kategoriSOP.updatedAt).toLocaleString('id-ID', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })
                                : '-'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => router.push(`/admin/sop/kategori-sop/${kategoriSOP.id}/edit`)}
                                  className="text-[#03438f] hover:text-[#012f65]"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteKategoriSOP(kategoriSOP.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Nama SOP Section */}
            {activeTab === 'namaSOP' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Nama SOP</h2>
                    <p className="text-gray-600">Kelola nama SOP</p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/sop/nama-sop/new')}
                    className="flex items-center space-x-2 bg-[#03438f] text-white px-4 py-2 rounded-lg hover:bg-[#012f65] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{sopContent.actions.add} Nama SOP</span>
                  </button>
                </div>

                {/* Search and Filters */}
                <div className="flex items-end justify-left gap-4">
                  <div className="flex items-center space-x-4 flex-1 max-w-md">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari nama SOP..."
                        value={namaSOPSearch}
                        onChange={(e) => setNamaSOPSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      />
                    </div>
                    {namaSOPSearch && (
                      <button
                        onClick={() => setNamaSOPSearch('')}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter Kategori</label>
                      <select
                        value={namaSOPKategoriFilter}
                        onChange={(e) => setNamaSOPKategoriFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      >
                        <option value="">Semua Kategori</option>
                        {kategoriSOPs.map((kategoriSOP) => (
                          <option key={kategoriSOP.id} value={kategoriSOP.id}>
                            {kategoriSOP.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {namaSOPKategoriFilter && (
                      <button
                        onClick={() => setNamaSOPKategoriFilter('')}
                        className="mt-7 text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : sops.length === 0 ? (
                  <div className="text-center py-8">
                    <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada data nama SOP</p>
                  </div>
                ) : filteredSOPs.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada nama SOP yang sesuai dengan pencarian atau filter</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nama
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deskripsi
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kategori
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dibuat
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Diupdate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSOPs.map((sop) => (
                          <tr key={sop.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{sop.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500">{sop.description ? sop.description.substring(0, 50) + (sop.description.length > 50 ? '...' : '') : '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{sop.kategoriSOP.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(sop.createdAt).toLocaleString('id-ID', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {sop.updatedAt && sop.updatedAt !== sop.createdAt 
                                ? new Date(sop.updatedAt).toLocaleString('id-ID', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })
                                : '-'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => router.push(`/admin/sop/nama-sop/${sop.id}/edit`)}
                                  className="text-[#03438f] hover:text-[#012f65]"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSOP(sop.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Jenis SOP Section */}
            {activeTab === 'jenisSOP' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Jenis SOP</h2>
                    <p className="text-gray-600">Kelola jenis SOP</p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/sop/jenis-sop/new')}
                    className="flex items-center space-x-2 bg-[#03438f] text-white px-4 py-2 rounded-lg hover:bg-[#012f65] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{sopContent.actions.add} Jenis SOP</span>
                  </button>
                </div>

                {/* Search and Filters */}
                <div className="flex items-end justify-left gap-4">
                  <div className="flex items-center space-x-4 flex-1 max-w-md">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari jenis SOP..."
                        value={jenisSOPSearch}
                        onChange={(e) => setJenisSOPSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      />
                    </div>
                    {jenisSOPSearch && (
                      <button
                        onClick={() => setJenisSOPSearch('')}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter Kategori</label>
                      <select
                        value={jenisSOPKategoriFilter}
                        onChange={(e) => {
                          setJenisSOPKategoriFilter(e.target.value)
                          setJenisSOPSOPFilter('') // Reset SOP filter when category changes
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      >
                        <option value="">Semua Kategori</option>
                        {kategoriSOPs.map((kategoriSOP) => (
                          <option key={kategoriSOP.id} value={kategoriSOP.id}>
                            {kategoriSOP.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter SOP</label>
                      <select
                        value={jenisSOPSOPFilter}
                        onChange={(e) => setJenisSOPSOPFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      >
                        <option value="">Semua SOP</option>
                        {sops
                          .filter(sop => !jenisSOPKategoriFilter || sop.kategoriSOP.id === jenisSOPKategoriFilter)
                          .map((sop) => (
                            <option key={sop.id} value={sop.id}>
                              {sop.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    {jenisSOPSOPFilter && (
                      <button
                        onClick={() => setJenisSOPSOPFilter('')}
                        className="mt-7 text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : jenisSOPs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada data jenis SOP</p>
                  </div>
                ) : filteredJenisSOPs.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada jenis SOP yang sesuai dengan pencarian atau filter</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nama
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Konten
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SOP
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kategori
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dibuat
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Diupdate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Diupdate Oleh
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Catatan Update
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredJenisSOPs.map((jenisSOP) => (
                          <tr key={jenisSOP.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{jenisSOP.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500">{jenisSOP.content ? jenisSOP.content.substring(0, 50) + (jenisSOP.content.length > 50 ? '...' : '') : '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{jenisSOP.sop.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{jenisSOP.sop.kategoriSOP.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(jenisSOP.createdAt).toLocaleString('id-ID', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {jenisSOP.updatedAt && jenisSOP.updatedAt !== jenisSOP.createdAt 
                                ? new Date(jenisSOP.updatedAt).toLocaleString('id-ID', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })
                                : '-'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {jenisSOP.updatedBy || '-'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500">{jenisSOP.updateNotes ? jenisSOP.updateNotes.substring(0, 50) + (jenisSOP.updateNotes.length > 50 ? '...' : '') : '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => router.push(`/admin/sop/jenis-sop/${jenisSOP.id}/edit`)}
                                  className="text-[#03438f] hover:text-[#012f65]"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteJenisSOP(jenisSOP.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

