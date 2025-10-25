'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import productContent from "@/content/product.json"
import { Package, Tag, Layers, Plus, Edit, Trash2, Eye } from "lucide-react"

interface Brand {
  id: string
  name: string
  description?: string
  images: string[]
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
  sku?: string
  price?: number
  stock?: number
  images: string[]
  subkategoriProduk: Subcategory
  detailProduks: ProductDetail[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

interface ProductDetail {
  id: string
  name: string
  value: string
  images: string[]
}

export default function ProductManagement() {
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

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    if ((session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
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
      const [brandsRes, categoriesRes, productsRes] = await Promise.all([
        fetch('/api/brand'),
        fetch('/api/category'),
        fetch('/api/product')
      ])

      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        setBrands(brandsData)
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData.categories)
        setSubcategories(categoriesData.subcategories)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
      }
      
      setDataLoaded(true)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBrand = async (id: string) => {
    if (!confirm(productContent.messages.confirmDelete)) return

    try {
      const response = await fetch(`/api/brand/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setBrands(brands.filter(brand => brand.id !== id))
        alert(productContent.messages.itemDeleted)
      } else {
        const error = await response.json()
        alert(error.error || 'Error deleting brand')
      }
    } catch (error) {
      console.error('Error deleting brand:', error)
      alert('Error deleting brand')
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
      })

      if (response.ok) {
        if (type === 'category') {
          setCategories(categories.filter(category => category.id !== id))
        } else {
          setSubcategories(subcategories.filter(subcategory => subcategory.id !== id))
        }
        alert(productContent.messages.itemDeleted)
      } else {
        const error = await response.json()
        alert(error.error || 'Error deleting category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Error deleting category')
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(productContent.messages.confirmDelete)) return

    try {
      const response = await fetch(`/api/product/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setProducts(products.filter(product => product.id !== id))
        alert(productContent.messages.itemDeleted)
      } else {
        const error = await response.json()
        alert(error.error || 'Error deleting product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product')
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
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Package className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'brand', label: sections.brand.title, icon: Tag },
                { id: 'category', label: sections.category.title, icon: Layers },
                { id: 'product', label: sections.product.title, icon: Package }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
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
            {/* Brand Section */}
            {activeTab === 'brand' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{sections.brand.title}</h2>
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

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : brands.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{sections.brand.table.noData}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.name}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.description}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.brand.table.headers.images}
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
                        {brands.map((brand) => (
                          <tr key={brand.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{brand.description || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{brand.images.length} gambar</div>
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
                    <h2 className="text-xl font-semibold text-gray-900">{sections.category.title}</h2>
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

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : categories.length === 0 && subcategories.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{sections.category.table.noData}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Categories */}
                    {categories.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Kategori Utama</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.name}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.brand}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {sections.category.table.headers.images}
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
                              {categories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{category.brand.name}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{category.images.length} gambar</div>
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
                      </div>
                    )}

                    {/* Subcategories */}
                    {subcategories.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Subkategori</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
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
                                  {sections.category.table.headers.images}
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
                              {subcategories.map((subcategory) => (
                                <tr key={subcategory.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{subcategory.name}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{subcategory.kategoriProduk.name}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{subcategory.kategoriProduk.brand.name}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{subcategory.images.length} gambar</div>
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Product Section */}
            {activeTab === 'product' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{sections.product.title}</h2>
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

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{sections.product.table.noData}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.name}
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
                            {sections.product.table.headers.price}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {sections.product.table.headers.stock}
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
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              {product.sku && (
                                <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {product.subkategoriProduk.kategoriProduk.brand.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {product.subkategoriProduk.kategoriProduk.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {product.subkategoriProduk.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {product.price ? `Rp ${product.price.toLocaleString()}` : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{product.stock || 0}</div>
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
