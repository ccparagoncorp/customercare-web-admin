"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trash2, X, Megaphone, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"

interface Announcement {
  id: string
  judul: string
  deskripsi?: string | null
  link?: string | null
  image: string[]
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  updatedBy?: string | null
}

export function AnnouncementTable() {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  // Fetch announcements data
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      })

      const response = await fetch(`/api/announcement?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements || [])
        setPagination(prev => ({
          ...prev,
          ...data.pagination
        }))
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearchTerm])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 1000)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

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
    if (!confirm('Apakah Anda yakin ingin menghapus announcement ini?')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/announcement?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setAnnouncements(prev => prev.filter(item => item.id !== id))
        setPagination(prev => ({ ...prev, total: prev.total - 1 }))
      } else {
        fetchAnnouncements()
      }
    } catch (error) {
      console.error('Error deleting announcement:', error)
      fetchAnnouncements()
    } finally {
      setLoading(false)
    }
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
                placeholder="Cari announcement..."
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
            onClick={() => router.push('/admin/announcement/new')}
            className="bg-[#03438f] hover:bg-[#03438f]/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Announcement
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading && !announcements.length ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Belum ada announcement
            </h3>
            <p className="text-gray-600 mb-4">Mulai dengan membuat announcement baru</p>
            <Button
              onClick={() => router.push('/admin/announcement/new')}
              className="bg-[#03438f] hover:bg-[#03438f]/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Announcement
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
                    Judul
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deskripsi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gambar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dibuat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dibuat oleh
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diupdate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diupdate oleh
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {announcements.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="">
                        <div className="text-sm font-medium text-gray-900">
                          {item.judul}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        <div className="line-clamp-3 whitespace-pre-line">
                          {item.deskripsi || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Buka Link
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {item.image && item.image.length > 0 ? (
                          <>
                            {item.image.slice(0, 3).map((img, idx) => (
                              <Image
                                key={idx}
                                src={img}
                                alt={`${item.judul} ${idx + 1}`}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded object-cover"
                                unoptimized
                              />
                            ))}
                            {item.image.length > 3 && (
                              <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                                +{item.image.length - 3}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleString('id-ID', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.createdBy || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.updatedAt && item.updatedAt !== item.createdAt 
                        ? new Date(item.updatedAt).toLocaleString('id-ID', { 
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
                      {item.updatedBy || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/announcement/${item.id}/edit`)}
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
              Menampilkan {((pagination.page - 1) * pagination.limit) + 1} sampai {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} announcement
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
    </div>
  )
}

