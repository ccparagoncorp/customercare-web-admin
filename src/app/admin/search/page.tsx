'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Package, Users, FileText, BookOpen, Building2, Layers, Tag, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { AdminLayout } from '@/components/admin/AdminLayout'

interface SearchResult {
  type: 'brand' | 'product' | 'kategori' | 'subkategori' | 'sop' | 'knowledge' | 'user' | 'agent'
  id: string
  title: string
  description: string | null
  image: string | null
  url: string
  metadata?: {
    [key: string]: string | undefined
  }
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState(query)

  useEffect(() => {
    if (query.trim().length >= 2) {
      performSearch(query.trim())
    } else {
      setResults([])
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=50`)
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Error searching:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim().length >= 2) {
      router.push(`/admin/search?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'brand':
        return <Building2 className="h-5 w-5 text-blue-600" />
      case 'product':
        return <Package className="h-5 w-5 text-green-600" />
      case 'kategori':
        return <Layers className="h-5 w-5 text-purple-600" />
      case 'subkategori':
        return <Tag className="h-5 w-5 text-pink-600" />
      case 'sop':
        return <FileText className="h-5 w-5 text-orange-600" />
      case 'knowledge':
        return <BookOpen className="h-5 w-5 text-indigo-600" />
      case 'user':
        return <Users className="h-5 w-5 text-gray-600" />
      case 'agent':
        return <Users className="h-5 w-5 text-cyan-600" />
      default:
        return <Search className="h-5 w-5 text-gray-600" />
    }
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'brand':
        return 'Brand'
      case 'product':
        return 'Produk'
      case 'kategori':
        return 'Kategori'
      case 'subkategori':
        return 'Subkategori'
      case 'sop':
        return 'SOP'
      case 'knowledge':
        return 'Knowledge'
      case 'user':
        return 'User'
      case 'agent':
        return 'Agent'
      default:
        return 'Hasil'
    }
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <AdminLayout>
      <div className="space-y-6 -mt-6 -mx-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-12 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <form onSubmit={handleSearch} className="max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari produk, brand, user, SOP, knowledge..."
                  className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-[#03438f] text-white rounded-md hover:bg-[#012f65] transition-colors"
                >
                  Cari
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!query ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cari sesuatu</h2>
            <p className="text-gray-600">Masukkan kata kunci untuk mencari produk, brand, user, SOP, atau knowledge</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#03438f]" />
            <span className="ml-3 text-lg text-gray-600">Mencari...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Tidak ada hasil</h2>
            <p className="text-gray-600">Tidak ada hasil untuk &quot;{query}&quot;</p>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Hasil Pencarian untuk &quot;{query}&quot;
              </h1>
              <p className="text-gray-600 mt-1">{results.length} hasil ditemukan</p>
            </div>

            {/* Grouped Results */}
            <div className="space-y-8">
              {Object.entries(groupedResults).map(([type, typeResults]) => (
                <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {getTypeLabel(type as SearchResult['type'])} ({typeResults.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {typeResults.map((result) => (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.url}
                        className="block p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start space-x-4">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {getIcon(result.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              {result.title}
                            </h3>
                            {result.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {result.description}
                              </p>
                            )}
                            {result.metadata && Object.keys(result.metadata).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(result.metadata).map(([key, value]) => (
                                  value && (
                                    <span
                                      key={key}
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                    >
                                      {key}: {value}
                                    </span>
                                  )
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Image */}
                          {result.image && (
                            <div className="flex-shrink-0">
                              <img
                                src={result.image}
                                alt={result.title}
                                className="w-20 h-20 rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#03438f]" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}

