'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Package, Users, FileText, BookOpen, Building2, Layers, Tag, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

interface SearchDropdownProps {
  isOpen: boolean
  onClose: () => void
  query: string
}

export function SearchDropdown({ isOpen, onClose, query }: SearchDropdownProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debounce search
  useEffect(() => {
    if (!isOpen || !query || query.trim().length < 2) {
      setResults([])
      setSelectedIndex(-1)
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch(query.trim())
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, isOpen])

  const performSearch = async (searchQuery: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`)
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Error searching:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleResultClick = useCallback((result: SearchResult) => {
    router.push(result.url)
    onClose()
  }, [router, onClose])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        handleResultClick(results[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, onClose, handleResultClick])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'brand':
        return <Building2 className="h-4 w-4 text-blue-600" />
      case 'product':
        return <Package className="h-4 w-4 text-green-600" />
      case 'kategori':
        return <Layers className="h-4 w-4 text-purple-600" />
      case 'subkategori':
        return <Tag className="h-4 w-4 text-pink-600" />
      case 'sop':
        return <FileText className="h-4 w-4 text-orange-600" />
      case 'knowledge':
        return <BookOpen className="h-4 w-4 text-indigo-600" />
      case 'user':
        return <Users className="h-4 w-4 text-gray-600" />
      case 'agent':
        return <Users className="h-4 w-4 text-cyan-600" />
      default:
        return <Search className="h-4 w-4 text-gray-600" />
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

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] max-h-[500px] overflow-hidden flex flex-col"
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#03438f]" />
          <span className="ml-2 text-sm text-gray-600">Mencari...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Search className="h-12 w-12 mb-2 opacity-50" />
          <p className="text-sm">
            {query.trim().length < 2
              ? 'Ketik minimal 2 karakter untuk mencari'
              : `Tidak ada hasil untuk "${query}"`}
          </p>
        </div>
      ) : (
        <>
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600 font-medium">
              {results.length} hasil ditemukan
            </p>
          </div>
          <div className="overflow-y-auto flex-1">
            {results.map((result, index) => (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${
                  selectedIndex === index
                    ? 'bg-blue-50 border-[#03438f]'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(result.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {getTypeLabel(result.type)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {result.title}
                    </p>

                    {result.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {result.description}
                      </p>
                    )}

                    {result.metadata && Object.keys(result.metadata).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(result.metadata).map(([key, value]) => (
                          value && (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.image}
                        alt={result.title}
                        className="w-10 h-10 rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {query.trim().length >= 2 && (
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  router.push(`/admin/search?q=${encodeURIComponent(query)}`)
                  onClose()
                }}
                className="w-full text-center text-sm text-[#03438f] hover:text-[#012f65] font-medium"
              >
                Lihat Semua Hasil
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

