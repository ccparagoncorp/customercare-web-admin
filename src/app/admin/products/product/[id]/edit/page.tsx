'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use, useCallback } from 'react'
import Image from 'next/image'
import { AdminLayout } from "@/components/admin/AdminLayout"
import productContent from "@/content/product.json"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, X, Plus, Trash2 } from "lucide-react"

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
}

interface Category {
  id: string
  name: string
  brand: Brand
}

interface Subcategory {
  id: string
  name: string
  kategoriProduk: Category
}

interface ProductDetail {
  id?: string
  name: string
  detail: string
  images: string[]
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
}

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    kapasitas: '',
    harga: '',
    status: 'ACTIVE',
    images: [] as string[],
    brandId: '',
    categoryId: '',
    subcategoryId: '',
    details: [] as ProductDetail[],
    updateNotes: '',
    updatedBy: ''
  })

  const resolvedParams = use(params)

  const fetchData = useCallback(async () => {
    setFetching(true)
    setError(null)
    
    try {
      const [brandsRes, categoriesRes, productRes] = await Promise.all([
        fetch('/api/brand'),
        fetch('/api/category'),
        fetch(`/api/product/${resolvedParams.id}`)
      ])

      // Check for errors
      const errors: string[] = []
      
      if (!brandsRes.ok) {
        const errorData = await brandsRes.json().catch(() => ({}))
        errors.push(`Gagal memuat brand: ${errorData.error || brandsRes.statusText}`)
      } else {
        const brandsData = await brandsRes.json()
        setBrands(brandsData)
      }

      if (!categoriesRes.ok) {
        const errorData = await categoriesRes.json().catch(() => ({}))
        errors.push(`Gagal memuat kategori: ${errorData.error || categoriesRes.statusText}`)
      } else {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData.categories)
        setSubcategories(categoriesData.subcategories)
      }

      if (!productRes.ok) {
        const errorData = await productRes.json().catch(() => ({}))
        if (productRes.status === 404) {
          setError('Produk tidak ditemukan')
          setTimeout(() => {
            router.push('/admin/products')
          }, 2000)
          return
        }
        errors.push(`Gagal memuat produk: ${errorData.error || productRes.statusText}`)
      } else {
        const productData = await productRes.json()
        const user = session?.user as UserWithRole | undefined
        setProduct(productData)
        setFormData({
          name: productData.name,
          description: productData.description || '',
          kapasitas: productData.kapasitas || '',
          harga: (productData.harga != null ? String(productData.harga) : ''),
          status: productData.status || 'ACTIVE',
          images: productData.images || [],
          brandId: (productData.subkategoriProduk?.kategoriProduk?.brand?.id) || (productData.kategoriProduk?.brand?.id) || '',
          categoryId: (productData.subkategoriProduk?.kategoriProduk?.id) || (productData.kategoriProduk?.id) || '',
          subcategoryId: productData.subkategoriProduk?.id || '',
          details: productData.detailProduks || [],
          updateNotes: '',
          updatedBy: user?.email || ''
        })
      }

      if (errors.length > 0) {
        setError(errors.join(', '))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data'
      
      // Check if it's a database connection error
      if (errorMessage.includes('database') || errorMessage.includes('connection') || errorMessage.includes('Can\'t reach')) {
        setError('Tidak dapat terhubung ke database. Pastikan koneksi database aktif dan DATABASE_URL sudah benar.')
      } else {
        setError(`Error: ${errorMessage}`)
      }
    } finally {
      setFetching(false)
    }
  }, [resolvedParams.id, session, router])

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

    fetchData()
  }, [session, status, router, fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/product/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          harga: formData.harga ? String(formData.harga) : undefined,
        })
      })

      if (response.ok) {
        alert(productContent.messages.itemUpdated)
        router.push('/admin/products?tab=product')
      } else {
        const error = await response.json()
        alert(error.error || 'Error updating product')
      }
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Error updating product')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (files: FileList) => {
    setUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', 'products')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          console.error('Upload error:', error)
          alert(`Upload failed: ${error.error}`)
          return null
        }

        const result = await response.json()
        return result.url
      })

      const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[]
      if (uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls]
        }))
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const addDetail = () => {
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, { name: '', detail: '', images: [] }]
    }))
  }

  const removeDetail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }))
  }

  const updateDetail = (index: number, field: keyof ProductDetail, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map((detail, i) =>
        i === index ? { ...detail, [field]: value } : detail
      )
    }))
  }

  const handleDetailImageUpload = (detailIndex: number, files: FileList) => {
    const uploadedUrls = Array.from(files).map(file => URL.createObjectURL(file))
    updateDetail(detailIndex, 'images', [...formData.details[detailIndex].images, ...uploadedUrls])
  }

  const removeDetailImage = (detailIndex: number, imageIndex: number) => {
    const detail = formData.details[detailIndex]
    updateDetail(detailIndex, 'images', detail.images.filter((_, i) => i !== imageIndex))
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

  // Show loading state while fetching data
  if (fetching) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data produk...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Show error state if there's an error and no product data
  if (error && !product) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold mb-2">Edit Produk</h1>
                <p className="text-blue-100 text-lg">Error</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Error Memuat Data</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <div className="flex space-x-4">
                  <Button
                    onClick={() => fetchData()}
                    className="bg-[#03438f] hover:bg-[#012f65] text-white"
                  >
                    Coba Lagi
                  </Button>
                  <Button
                    onClick={() => router.push('/admin/products')}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Kembali ke Daftar Produk
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // If no product data but no error, show loading or redirect
  if (!product) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Produk tidak ditemukan</p>
            <Button
              onClick={() => router.push('/admin/products')}
              className="bg-[#03438f] hover:bg-[#012f65] text-white"
            >
              Kembali ke Daftar Produk
            </Button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const { sections } = productContent

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold mb-2">{sections.product.form.title.edit}</h1>
              <p className="text-blue-100 text-lg">Edit produk: {product.name}</p>
            </div>
          </div>
        </div>

        {/* Error Banner (if error but product data exists) */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Peringatan</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchData()}
                  className="text-sm text-red-600 hover:text-red-800 underline mt-2"
                >
                  Coba muat ulang data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Edit Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Informasi Edit</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="updatedBy">{sections.product.form.fields.updatedBy.label} *</Label>
                  <Input
                    id="updatedBy"
                    type="text"
                    value={formData.updatedBy || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, updatedBy: e.target.value }))}
                    placeholder={sections.product.form.fields.updatedBy.placeholder}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="updateNotes">{sections.product.form.fields.updateNotes.label} *</Label>
                  <textarea
                    id="updateNotes"
                    value={formData.updateNotes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, updateNotes: e.target.value }))}
                    placeholder={sections.product.form.fields.updateNotes.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                    rows={3}
                    required
                  />
                </div>
              </div>
            </div>
            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Informasi Dasar</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{sections.product.form.fields.name.label}</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={sections.product.form.fields.name.placeholder}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{sections.product.form.fields.description.label}</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={sections.product.form.fields.description.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kapasitas">{sections.product.form.fields.kapasitas.label}</Label>
                <Input
                  id="kapasitas"
                  type="text"
                  value={formData.kapasitas}
                  onChange={(e) => setFormData(prev => ({ ...prev, kapasitas: e.target.value }))}
                  placeholder={sections.product.form.fields.kapasitas.placeholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="harga">Harga</Label>
                <Input
                  id="harga"
                  type="number"
                  step="0.01"
                  value={formData.harga}
                  onChange={(e) => setFormData(prev => ({ ...prev, harga: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{sections.product.form.fields.status?.label || 'Status'}</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                  required
                >
                  <option value="">{sections.product.form.fields.status?.placeholder || 'Pilih status produk'}</option>
                  {Object.entries(productContent.statusOptions || {}).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Kategori</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="brand">{sections.product.form.fields.brand.label}</Label>
                  <select
                    id="brand"
                    value={formData.brandId}
                    onChange={(e) => {
                      const newBrandId = e.target.value
                      const hasCategories = categories.some(cat => cat.brand.id === newBrandId)
                      setFormData(prev => ({
                        ...prev,
                        brandId: newBrandId,
                        categoryId: hasCategories ? '' : '-',
                        subcategoryId: ''
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                    required
                  >
                    <option value="">{sections.product.form.fields.brand.placeholder}</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">{sections.product.form.fields.category.label}</Label>
                  <select
                    id="category"
                    value={formData.categoryId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      categoryId: e.target.value,
                      subcategoryId: subcategories.some(sc => sc.kategoriProduk.id === e.target.value) ? '' : '-'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent disabled:text-gray-400 disabled:bg-gray-50"
                    required
                    disabled={!categories.some(cat => cat.brand.id === formData.brandId)}
                  >
                    <option value="">{
                      categories.some(cat => cat.brand.id === formData.brandId)
                        ? sections.product.form.fields.category.placeholder
                        : 'Tidak ada kategori'
                    }</option>
                    {categories
                      .filter(category => category.brand.id === formData.brandId)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">{sections.product.form.fields.subcategory.label}</Label>
                  <select
                    id="subcategory"
                    value={formData.subcategoryId}
                    onChange={(e) => setFormData(prev => ({ ...prev, subcategoryId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent disabled:text-gray-400 disabled:bg-gray-50"
                    required
                    disabled={!subcategories.some(sc => sc.kategoriProduk.id === formData.categoryId)}
                  >
                    <option value="">{
                      subcategories.some(sc => sc.kategoriProduk.id === formData.categoryId)
                        ? sections.product.form.fields.subcategory.placeholder
                        : 'Tidak ada subkategori'
                    }</option>
                    {subcategories
                      .filter(subcategory => subcategory.kategoriProduk.id === formData.categoryId)
                      .map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Product Images */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Gambar Produk</h3>

              <div className="space-y-2">
                <Label>{sections.product.form.fields.images.label}</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-sm text-gray-600 mb-4">
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <span className="text-[#03438f] hover:text-[#012f65]">
                          {uploading ? 'Mengupload...' : 'Klik untuk upload gambar'}
                        </span>
                      </label>
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading && (
                        <div className="flex items-center justify-center space-x-2 mt-2">
                          <div className="w-4 h-4 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF hingga 10MB</p>
                  </div>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative">
                        <Image
                          src={image}
                          alt={`Upload ${index + 1}`}
                          width={200}
                          height={200}
                          className="max-w-full h-auto rounded-lg object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{sections.product.form.details.title}</h3>
                <Button
                  type="button"
                  onClick={addDetail}
                  className="flex items-center space-x-2 bg-[#03438f] hover:bg-[#012f65] text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>{sections.product.form.details.addDetail}</span>
                </Button>
              </div>

              {formData.details.map((detail, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Detail {index + 1}</h4>
                    <Button
                      type="button"
                      onClick={() => removeDetail(index)}
                      variant="outline"
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 w-full">
                    <Label>{sections.product.form.details.fields.name.label}</Label>
                    <Input
                      type="text"
                      value={detail.name}
                      onChange={(e) => updateDetail(index, 'name', e.target.value)}
                      placeholder={sections.product.form.details.fields.name.placeholder}
                    />
                  </div>
            
                  <div className="space-y-2 w-full">
                    <Label>{sections.product.form.details.fields.value.label}</Label>
                    <textarea
                      value={detail.detail}
                      onChange={(e) => updateDetail(index, 'detail', e.target.value)}
                      placeholder={sections.product.form.details.fields.value.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{sections.product.form.details.fields.images.label}</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <label
                          htmlFor={`detail-image-${index}`}
                          className="text-sm text-[#03438f] hover:text-[#012f65] cursor-pointer"
                        >
                          Upload gambar detail
                        </label>
                        <input
                          id={`detail-image-${index}`}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => e.target.files && handleDetailImageUpload(index, e.target.files)}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {detail.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {detail.images.map((img, i) => (
                          <div key={i} className="relative">
                            <Image
                              src={img}
                              alt={`Detail ${index + 1} - ${i + 1}`}
                              width={200}
                              height={200}
                              className="max-w-full h-auto rounded-lg object-cover"
                              unoptimized
                            />
                            <button
                              type="button"
                              onClick={() => removeDetailImage(index, i)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            

            {/* Submit */}
            <div className="flex justify-end pt-6 border-t">
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#03438f] hover:bg-[#012f65] text-white px-6 py-2 rounded-lg"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}
