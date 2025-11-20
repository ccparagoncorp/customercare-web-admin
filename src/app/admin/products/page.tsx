'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import { AdminLayout } from "@/components/admin/AdminLayout"
import productContent from "@/content/product.json"
import { Package, Tag, Layers, Plus, Edit, Trash2, Search, X, History } from "lucide-react"

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

interface Brand {
  id: string
  name: string
  description?: string
  images: string[]
  colorbase?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

interface Category {
  id: string
  name: string
  description?: string
  images: string[]
  brand: Brand
  subkategoriProduks: Subcategory[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

interface Subcategory {
  id: string
  name: string
  description?: string
  images: string[]
  kategoriProduk: Category
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

interface Product {
  id: string
  name: string
  description?: string
  kapasitas?: string
  harga?: string | number
  status: string
  images: string[]
  brand?: Brand
  subkategoriProduk?: Subcategory
  kategoriProduk?: Category
  detailProduks: ProductDetail[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

interface ProductDetail {
  id: string
  name: string
  detail: string
  images: string[]
}

function ProductManagementContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'brand' | 'category' | 'product'>('brand')
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // Search and filter states
  const [brandSearch, setBrandSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [productBrandFilter, setProductBrandFilter] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('')
  const [productSubcategoryFilter, setProductSubcategoryFilter] = useState('')
  const [categoryBrandFilter, setCategoryBrandFilter] = useState('')
  const [subcategoryBrandFilter, setSubcategoryBrandFilter] = useState('')

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
    if (tab && ['brand', 'category', 'product'].includes(tab)) {
      setActiveTab(tab as 'brand' | 'category' | 'product')
    }

    // Only fetch data once when component mounts
    if (!dataLoaded) {
      fetchData()
    }
  }, [session, status, router, dataLoaded, searchParams])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Use Promise.allSettled to handle errors gracefully
      const [brandsResult, categoriesResult, productsResult] = await Promise.allSettled([
        fetch('/api/brand'),
        fetch('/api/category'),
        fetch('/api/product')
      ])
      
      // Handle brands
      const brandsRes = brandsResult.status === 'fulfilled' ? brandsResult.value : { ok: false, json: () => Promise.resolve([]) }
      if (brandsRes.ok) {
        try {
          const brandsData = await brandsRes.json()
          setBrands(Array.isArray(brandsData) ? brandsData : [])
        } catch {
          setBrands([])
        }
      } else {
        setBrands([])
      }

      // Handle categories
      const categoriesRes = categoriesResult.status === 'fulfilled' ? categoriesResult.value : { ok: false, json: () => Promise.resolve({ categories: [], subcategories: [] }) }
      if (categoriesRes.ok) {
        try {
          const categoriesData = await categoriesRes.json()
          setCategories(Array.isArray(categoriesData?.categories) ? categoriesData.categories : [])
          setSubcategories(Array.isArray(categoriesData?.subcategories) ? categoriesData.subcategories : [])
        } catch {
          setCategories([])
          setSubcategories([])
        }
      } else {
        setCategories([])
        setSubcategories([])
      }

      // Handle products
      const productsRes = productsResult.status === 'fulfilled' ? productsResult.value : { ok: false, json: () => Promise.resolve([]) }
      if (productsRes.ok) {
        try {
          const productsData = await productsRes.json()
          setProducts(Array.isArray(productsData) ? productsData : [])
        } catch {
          setProducts([])
        }
      } else {
        setProducts([])
      }
      
      setDataLoaded(true)
    } catch {
      // Silently handle errors - set empty arrays as fallback
      // No console.error to prevent console pollution
      setBrands([])
      setCategories([])
      setSubcategories([])
      setProducts([])
      setDataLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  // Filter functions
  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
    (brand.description && brand.description.toLowerCase().includes(brandSearch.toLowerCase()))
  )

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(categorySearch.toLowerCase()))
    const matchesBrand = !categoryBrandFilter || category.brand.id === categoryBrandFilter
    return matchesSearch && matchesBrand
  })

  const filteredSubcategories = subcategories.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
      (sub.description && sub.description.toLowerCase().includes(categorySearch.toLowerCase()))
    const matchesBrand = !subcategoryBrandFilter || sub.kategoriProduk.brand.id === subcategoryBrandFilter
    return matchesSearch && matchesBrand
  })

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(productSearch.toLowerCase())) ||
      (product.kapasitas && product.kapasitas.toLowerCase().includes(productSearch.toLowerCase()))
    
    const matchesBrand = !productBrandFilter || 
      (product.subkategoriProduk?.kategoriProduk?.brand?.id || 
       product.kategoriProduk?.brand?.id || 
       product.brand?.id) === productBrandFilter
    const matchesCategory = !productCategoryFilter || (product.subkategoriProduk?.kategoriProduk?.id || product.kategoriProduk?.id) === productCategoryFilter
    const matchesSubcategory = !productSubcategoryFilter || product.subkategoriProduk?.id === productSubcategoryFilter
    
    return matchesSearch && matchesBrand && matchesCategory && matchesSubcategory
  })

  const handleDeleteBrand = async (id: string) => {
    if (!confirm(productContent.messages.confirmDelete)) return

    try {
      const response = await fetch(`/api/brand/${id}`, {
        method: 'DELETE'
      }).catch(() => ({ ok: false, json: () => Promise.resolve({ error: 'Network error' }) }))

      if (response.ok) {
        setBrands(brands.filter(brand => brand.id !== id))
        alert(productContent.messages.itemDeleted)
      } else {
        try {
          const error = await response.json()
          alert(error.error || 'Error deleting brand')
        } catch {
          alert('Error deleting brand')
        }
      }
    } catch {
      alert('Error deleting brand. Please try again.')
    }
  }

  const handleDeleteCategory = async (id: string, type: 'category' | 'subcategory') => {
    if (!confirm(productContent.messages.confirmDelete)) return

    try {
      const response = await fetch(`/api/category/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      }).catch(() => ({ ok: false, json: () => Promise.resolve({ error: 'Network error' }) }))

      if (response.ok) {
        if (type === 'category') {
          setCategories(categories.filter(category => category.id !== id))
        } else {
          setSubcategories(subcategories.filter(subcategory => subcategory.id !== id))
        }
        alert(productContent.messages.itemDeleted)
      } else {
        try {
          const error = await response.json()
          alert(error.error || 'Error deleting category')
        } catch {
          alert('Error deleting category')
        }
      }
    } catch {
      alert('Error deleting category. Please try again.')
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(productContent.messages.confirmDelete)) return

    try {
      const response = await fetch(`/api/product/${id}`, {
        method: 'DELETE'
      }).catch(() => ({ ok: false, json: () => Promise.resolve({ error: 'Network error' }) }))

      if (response.ok) {
        setProducts(products.filter(product => product.id !== id))
        alert(productContent.messages.itemDeleted)
      } else {
        try {
          const error = await response.json()
          alert(error.error || 'Error deleting product')
        } catch {
          alert('Error deleting product')
        }
      }
    } catch {
      alert('Error deleting product. Please try again.')
    }
  }


  // Don't block UI with session loading - show layout immediately
  if (!session && status !== 'loading') {
    return null
  }

  const { sections } = productContent

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{productContent.title}</h1>
              <p className="text-blue-100 text-lg">Kelola data produk, brand, dan kategori</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/products/tracker')}
                className="hidden md:flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Lihat Audit Log"
              >
                <History className="h-5 w-5" />
                <span>Audit Log</span>
              </button>
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Package className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-6">
              {[
                { 
                  id: 'brand', 
                  label: sections.brand.title, 
                  icon: Tag,
                  count: filteredBrands.length,
                  total: brands.length
                },
                { 
                  id: 'category', 
                  label: sections.category.title, 
                  icon: Layers,
                  count: filteredCategories.length + filteredSubcategories.length,
                  total: categories.length + subcategories.length
                },
                { 
                  id: 'product', 
                  label: sections.product.title, 
                  icon: Package,
                  count: filteredProducts.length,
                  total: products.length
                }
              ].map((tab) => {
                const Icon = tab.icon
                const showCount = tab.count !== tab.total || tab.count > 0
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'brand' | 'category' | 'product')}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#03438f] text-[#03438f]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                    {showCount && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        activeTab === tab.id
                          ? 'bg-[#03438f]/10 text-[#03438f]'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Brand Section */}
            {activeTab === 'brand' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-semibold text-gray-900">{sections.brand.title}</h2>
                      <span className="px-2.5 py-1 rounded-full text-sm font-semibold bg-[#03438f]/10 text-[#03438f]">
                        {filteredBrands.length} {filteredBrands.length !== brands.length ? `dari ${brands.length}` : ''}
                      </span>
                    </div>
                    <p className="text-gray-600">{sections.brand.description}</p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/products/brand/new')}
                    className="flex items-center space-x-2 bg-[#03438f] text-white px-4 py-2 rounded-lg hover:bg-[#012f65] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{productContent.actions.add} Brand</span>
                  </button>
                </div>

                {/* Search */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari brand..."
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      />
                    </div>
                  </div>
                  {brandSearch && (
                    <button
                      onClick={() => setBrandSearch('')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filters dipindah ke atas masing-masing tabel */}

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : brands.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{sections.brand.table.noData}</p>
                  </div>
                ) : filteredBrands.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada brand yang sesuai dengan pencarian</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.images}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.name}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.description}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Base Color
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.createdAt}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.updatedAt}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.createdBy}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.updatedBy}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.actions}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredBrands.map((brand) => (
                          <tr key={brand.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-20 w-20">
                                  {brand.images && brand.images.length > 0 ? (
                                    <Image
                                      src={brand.images[0]}
                                      alt={brand.name}
                                      width={80}
                                      height={80}
                                      className="h-20 w-20 object-contain"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                                      <Tag className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{brand.description ? brand.description.substring(0, 20) + (brand.description.length > 20 ? '...' : '') : '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-6 h-6 rounded border border-gray-300"
                                  style={{ backgroundColor: brand.colorbase || '#03438f' }}
                                ></div>
                                <span className="text-sm text-gray-500 font-mono">
                                  {brand.colorbase || '#03438f'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(brand.createdAt).toLocaleString('id-ID', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {brand.updatedAt && brand.updatedAt !== brand.createdAt 
                                ? new Date(brand.updatedAt).toLocaleString('id-ID', { 
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
                              {brand.createdBy || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {brand.updatedBy || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => router.push(`/admin/products/brand/${brand.id}/edit`)}
                                  className="text-[#03438f] hover:text-[#012f65]"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBrand(brand.id)}
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

            {/* Category Section */}
            {activeTab === 'category' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-semibold text-gray-900">{sections.category.title}</h2>
                      <span className="px-2.5 py-1 rounded-full text-sm font-semibold bg-[#03438f]/10 text-[#03438f]">
                        {filteredCategories.length + filteredSubcategories.length} {(filteredCategories.length + filteredSubcategories.length) !== (categories.length + subcategories.length) ? `dari ${categories.length + subcategories.length}` : ''}
                      </span>
                    </div>
                    <p className="text-gray-600">{sections.category.description}</p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/products/category/new')}
                    className="flex items-center space-x-2 bg-[#03438f] text-white px-4 py-2 rounded-lg hover:bg-[#012f65] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{productContent.actions.add} Kategori/Subkategori</span>
                  </button>
                </div>

                {/* Search */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari kategori/subkategori..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      />
                    </div>
                  </div>
                  {categorySearch && (
                    <button
                      onClick={() => setCategorySearch('')}
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
                ) : categories.length === 0 && subcategories.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{sections.category.table.noData}</p>
                  </div>
                ) : filteredCategories.length === 0 && subcategories.filter(sub => 
                  sub.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                  (sub.description && sub.description.toLowerCase().includes(categorySearch.toLowerCase()))
                ).length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada kategori/subkategori yang sesuai dengan pencarian</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Categories */}
                    <div>
                      <div className="flex items-end justify-between mb-4 gap-4 flex-col md:flex-row">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">Kategori Utama</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            {filteredCategories.length}
                          </span>
                        </div>
                        <div className="w-full md:w-64">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Filter Brand</label>
                          <select
                            value={categoryBrandFilter}
                            onChange={(e) => setCategoryBrandFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                          >
                            <option value="">Semua Brand</option>
                            {brands.map((brand) => (
                              <option key={brand.id} value={brand.id}>{brand.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {filteredCategories.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.images}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.name}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.brand}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.createdAt}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.updatedAt}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.createdBy}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.updatedBy}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.actions}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredCategories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-20 w-20">
                                        {category.images && category.images.length > 0 ? (
                                          <Image
                                            src={category.images[0]}
                                            alt={category.name}
                                            width={80}
                                            height={80}
                                            className="h-20 w-20 object-contain"
                                            unoptimized
                                          />
                                        ) : (
                                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            <Layers className="h-5 w-5 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                      {(category.brand.name || '-')}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(category.createdAt).toLocaleString('id-ID', { 
                                      year: 'numeric', 
                                      month: '2-digit', 
                                      day: '2-digit', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {category.updatedAt && category.updatedAt !== category.createdAt 
                                      ? new Date(category.updatedAt).toLocaleString('id-ID', { 
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
                                    {category.createdBy || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {category.updatedBy || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => router.push(`/admin/products/category/${category.id}/edit`)}
                                        className="text-[#03438f] hover:text-[#012f65]"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCategory(category.id, 'category')}
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
                      ) : (
                        <div className="text-center py-8 text-gray-500">Tidak ada kategori untuk brand ini</div>
                      )}
                    </div>

                    {/* Subcategories */}
                    <div>
                      <div className="flex items-end justify-between mb-4 gap-4 flex-col md:flex-row">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">Subkategori</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            {filteredSubcategories.length}
                          </span>
                        </div>
                        <div className="w-full md:w-64">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Filter Brand</label>
                          <select
                            value={subcategoryBrandFilter}
                            onChange={(e) => setSubcategoryBrandFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                          >
                            <option value="">Semua Brand</option>
                            {brands.map((brand) => (
                              <option key={brand.id} value={brand.id}>{brand.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {filteredSubcategories.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.images}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.name}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.parent}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.brand}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.createdAt}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.updatedAt}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.createdBy}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.updatedBy}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.actions}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredSubcategories.map((subcategory) => (
                                <tr key={subcategory.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-20 w-20">
                                        {subcategory.images && subcategory.images.length > 0 ? (
                                          <Image
                                            src={subcategory.images[0]}
                                            alt={subcategory.name}
                                            width={80}
                                            height={80}
                                            className="h-20 w-20 object-contain"
                                            unoptimized
                                          />
                                        ) : (
                                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            <Layers className="h-5 w-5 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{subcategory.name}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{subcategory.kategoriProduk.name}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                      {(subcategory.kategoriProduk.brand?.name || '-')}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(subcategory.createdAt).toLocaleString('id-ID', { 
                                      year: 'numeric', 
                                      month: '2-digit', 
                                      day: '2-digit', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {subcategory.updatedAt && subcategory.updatedAt !== subcategory.createdAt 
                                      ? new Date(subcategory.updatedAt).toLocaleString('id-ID', { 
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
                                    {subcategory.createdBy || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {subcategory.updatedBy || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => router.push(`/admin/products/category/${subcategory.id}/edit`)}
                                        className="text-[#03438f] hover:text-[#012f65]"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCategory(subcategory.id, 'subcategory')}
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
                      ) : (
                        <div className="text-center py-8 text-gray-500">Tidak ada subkategori untuk brand ini</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Product Section */}
            {activeTab === 'product' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-semibold text-gray-900">{sections.product.title}</h2>
                      <span className="px-2.5 py-1 rounded-full text-sm font-semibold bg-[#03438f]/10 text-[#03438f]">
                        {filteredProducts.length} {filteredProducts.length !== products.length ? `dari ${products.length}` : ''}
                      </span>
                    </div>
                    <p className="text-gray-600">{sections.product.description}</p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/products/product/new')}
                    className="flex items-center space-x-2 bg-[#03438f] text-white px-4 py-2 rounded-lg hover:bg-[#012f65] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{productContent.actions.add} Produk</span>
                  </button>
                </div>

                {/* Search and Filters */}
                <div className="space-y-4">
                  {/* Search */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 max-w-md">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Cari produk..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                        />
                      </div>
                    </div>
                    {productSearch && (
                      <button
                        onClick={() => setProductSearch('')}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter Brand</label>
                      <select
                        value={productBrandFilter}
                        onChange={(e) => setProductBrandFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      >
                        <option value="">Semua Brand</option>
                        {brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter Kategori</label>
                      <select
                        value={productCategoryFilter}
                        onChange={(e) => {
                          setProductCategoryFilter(e.target.value)
                          setProductSubcategoryFilter('') // Reset subcategory when category changes
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      >
                        <option value="">Semua Kategori</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter Subkategori</label>
                      <select
                        value={productSubcategoryFilter}
                        onChange={(e) => setProductSubcategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                        disabled={!productCategoryFilter}
                      >
                        <option value="">Semua Subkategori</option>
                        {subcategories
                          .filter(sub => !productCategoryFilter || sub.kategoriProduk.id === productCategoryFilter)
                          .map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(productBrandFilter || productCategoryFilter || productSubcategoryFilter) && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setProductBrandFilter('')
                          setProductCategoryFilter('')
                          setProductSubcategoryFilter('')
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                      >
                        <X className="h-3 w-3" />
                        <span>Hapus Filter</span>
                      </button>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{sections.product.table.noData}</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada produk yang sesuai dengan pencarian atau filter</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.image}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.name}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.kapasitas}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Harga
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.brand}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.category}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.subcategory}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.status}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.createdAt}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.updatedAt}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.createdBy}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.updatedBy}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.actions}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-20 w-20">
                                  {product.images && product.images.length > 0 ? (
                                    <Image
                                      src={product.images[0]}
                                      alt={product.name}
                                      width={80}
                                      height={80}
                                      className="h-20 w-20 object-contain"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                      <Package className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{product.kapasitas || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {product.harga !== undefined && product.harga !== null && product.harga !== ''
                                  ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(product.harga))
                                  : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {product.subkategoriProduk?.kategoriProduk?.brand?.name || 
                                 product.kategoriProduk?.brand?.name || 
                                 product.brand?.name || 
                                 '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {(product.subkategoriProduk?.kategoriProduk?.name || product.kategoriProduk?.name) || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {product.subkategoriProduk?.name || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                product.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                                product.status === 'REVAMP' ? 'bg-yellow-100 text-yellow-800' :
                                product.status === 'DISCONTINUE' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {productContent.statusOptions?.[product.status as keyof typeof productContent.statusOptions] || product.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(product.createdAt).toLocaleString('id-ID', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.updatedAt && product.updatedAt !== product.createdAt 
                                ? new Date(product.updatedAt).toLocaleString('id-ID', { 
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
                              {product.createdBy || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.updatedBy || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => router.push(`/admin/products/product/${product.id}/edit`)}
                                  className="text-[#03438f] hover:text-[#012f65]"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
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

export default function ProductManagement() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    }>
      <ProductManagementContent />
    </Suspense>
  )
}
