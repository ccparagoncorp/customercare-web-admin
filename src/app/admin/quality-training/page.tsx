'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import qtContent from "@/content/quality-training.json"
import { FileText, FolderTree, FileCheck, Plus, Edit, Trash2, Search, X, LucideIcon } from "lucide-react"

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

interface QualityTraining {
  id: string
  title: string
  description?: string
  logos: string[]
  createdAt: string
  updatedAt: string
}

interface JenisQualityTraining {
  id: string
  name: string
  description?: string
  logos: string[]
  qualityTraining: QualityTraining
  createdAt: string
  updatedAt: string
}

export default function QualityTrainingManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'qualityTraining' | 'jenis'>('qualityTraining')
  const [qualityTrainings, setQualityTrainings] = useState<QualityTraining[]>([])
  const [jenisList, setJenisList] = useState<JenisQualityTraining[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Search and filter
  const [qtSearch, setQtSearch] = useState('')
  const [jenisSearch, setJenisSearch] = useState('')
  const [jenisQTFilter, setJenisQTFilter] = useState('')

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
    if (!dataLoaded) {
      fetchData()
    }
  }, [session, status, router, dataLoaded])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [qtRes, jenisRes] = await Promise.all([
        fetch('/api/quality-training'),
        fetch('/api/jenis-quality-training')
      ])
      if (qtRes.ok) setQualityTrainings(await qtRes.json())
      if (jenisRes.ok) setJenisList(await jenisRes.json())
      setDataLoaded(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredQTs = qualityTrainings.filter(qt =>
    qt.title.toLowerCase().includes(qtSearch.toLowerCase()) ||
    (qt.description && qt.description.toLowerCase().includes(qtSearch.toLowerCase()))
  )

  const filteredJenis = jenisList.filter(j => {
    const matchesSearch = j.name.toLowerCase().includes(jenisSearch.toLowerCase()) ||
      (j.description && j.description.toLowerCase().includes(jenisSearch.toLowerCase()))
    const matchesQT = !jenisQTFilter || j.qualityTraining.id === jenisQTFilter
    return matchesSearch && matchesQT
  })

  

  const handleDeleteQT = async (id: string) => {
    if (!confirm(qtContent.messages.confirmDelete)) return
    try {
      const res = await fetch(`/api/quality-training/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setQualityTrainings(prev => prev.filter(x => x.id !== id))
        alert(qtContent.messages.itemDeleted)
      } else {
        const err = await res.json(); alert(err.error || 'Error deleting')
      }
    } catch (e) { console.error(e); alert('Error deleting') }
  }

  const handleDeleteJenis = async (id: string) => {
    if (!confirm(qtContent.messages.confirmDelete)) return
    try {
      const res = await fetch(`/api/jenis-quality-training/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setJenisList(prev => prev.filter(x => x.id !== id))
        alert(qtContent.messages.itemDeleted)
      } else { const err = await res.json(); alert(err.error || 'Error deleting') }
    } catch (e) { console.error(e); alert('Error deleting') }
  }

  

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{qtContent.title}</h1>
              <p className="text-blue-100 text-lg">Kelola Quality & Training</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-6">
              {([
                { id: 'qualityTraining' as const, label: 'Quality & Training', icon: FolderTree },
                { id: 'jenis' as const, label: 'Jenis', icon: FileCheck }
              ] as Array<{ id: 'qualityTraining' | 'jenis', label: string, icon: LucideIcon }>).map((tab) => {
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
            {activeTab === 'qualityTraining' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Quality & Training</h2>
                    <p className="text-gray-600">Kelola data Quality & Training</p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/quality-training/new')}
                    className="flex items-center space-x-2 bg-[#03438f] text-white px-4 py-2 rounded-lg hover:bg-[#012f65] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{qtContent.actions.add} Quality & Training</span>
                  </button>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari Quality & Training..."
                        value={qtSearch}
                        onChange={(e) => setQtSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      />
                    </div>
                  </div>
                  {qtSearch && (
                    <button onClick={() => setQtSearch('')} className="text-gray-500 hover:text-gray-700">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : qualityTrainings.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada data Quality & Training</p>
                  </div>
                ) : filteredQTs.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada data yang sesuai dengan pencarian</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Judul</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diupdate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredQTs.map((qt) => (
                          <tr key={qt.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{qt.title}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500">{qt.description ? qt.description.substring(0, 50) + (qt.description.length > 50 ? '...' : '') : '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(qt.createdAt).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{qt.updatedAt && qt.updatedAt !== qt.createdAt ? new Date(qt.updatedAt).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button onClick={() => router.push(`/admin/quality-training/${qt.id}/edit`)} className="text-[#03438f] hover:text-[#012f65]">
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeleteQT(qt.id)} className="text-red-600 hover:text-red-800">
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

            {activeTab === 'jenis' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Jenis</h2>
                    <p className="text-gray-600">Kelola jenis Quality & Training</p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/quality-training/jenis/new')}
                    className="flex items-center space-x-2 bg-[#03438f] text-white px-4 py-2 rounded-lg hover:bg-[#012f65] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{qtContent.actions.add} Jenis</span>
                  </button>
                </div>

                <div className="flex items-end justify-left gap-4">
                  <div className="flex items-center space-x-4 flex-1 max-w-md">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari jenis..."
                        value={jenisSearch}
                        onChange={(e) => setJenisSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      />
                    </div>
                    {jenisSearch && (
                      <button onClick={() => setJenisSearch('')} className="text-gray-500 hover:text-gray-700">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter Q&T</label>
                      <select
                        value={jenisQTFilter}
                        onChange={(e) => setJenisQTFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      >
                        <option value="">Semua</option>
                        {qualityTrainings.map((qt) => (
                          <option key={qt.id} value={qt.id}>{qt.title}</option>
                        ))}
                      </select>
                    </div>
                    {jenisQTFilter && (
                      <button onClick={() => setJenisQTFilter('')} className="mt-7 text-gray-500 hover:text-gray-700">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : jenisList.length === 0 ? (
                  <div className="text-center py-8">
                    <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada data jenis</p>
                  </div>
                ) : filteredJenis.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada data yang sesuai</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality & Training</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diupdate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredJenis.map((j) => (
                          <tr key={j.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{j.name}</div></td>
                            <td className="px-6 py-4"><div className="text-sm text-gray-500">{j.description ? j.description.substring(0, 50) + (j.description.length > 50 ? '...' : '') : '-'}</div></td>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{j.qualityTraining.title}</div></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(j.createdAt).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{j.updatedAt && j.updatedAt !== j.createdAt ? new Date(j.updatedAt).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button onClick={() => router.push(`/admin/quality-training/jenis/${j.id}/edit`)} className="text-[#03438f] hover:text-[#012f65]"><Edit className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteJenis(j.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
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


