'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import productContent from "@/content/product.json"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, X, Plus, Trash2 } from "lucide-react"

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
  name: string
  value: string
  images: string[]
}

export default function NewProduct() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    stock: '',
    images: [] as string[],
    brandId: '',
    categoryId: '',
    subcategoryId: '',
    details: [] as ProductDetail[]
  })

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

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      const [brandsRes, categoriesRes] = await Promise.all([
        fetch('/api/brand'),
        fetch('/api/category')
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
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert(productContent.messages.itemSaved)
        router.push('/admin/products?tab=product')
      } else {
        const error = await response.json()
        alert(error.error || 'Error creating product')
      }
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Error creating product')
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
      details: [...prev.details, { name: '', value: '', images: [] }]
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
              <h1 className="text-3xl font-bold mb-2">{sections.product.form.title.add}</h1>
              <p className="text-blue-100 text-lg">Tambah produk baru ke sistem</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
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

                <div className="space-y-2">
                  <Label htmlFor="sku">{sections.product.form.fields.sku.label}</Label>
                  <Input
                    id="sku"
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder={sections.product.form.fields.sku.placeholder}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price">{sections.product.form.fields.price.label}</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder={sections.product.form.fields.price.placeholder}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">{sections.product.form.fields.stock.label}</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder={sections.product.form.fields.stock.placeholder}
                  />
                </div>
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
                      setFormData(prev => ({ 
                        ...prev, 
                        brandId: e.target.value,
                        categoryId: '',
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
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        categoryId: e.target.value,
                        subcategoryId: ''
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                    required
                  >
                    <option value="">{sections.product.form.fields.category.placeholder}</option>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                    required
                  >
                    <option value="">{sections.product.form.fields.subcategory.placeholder}</option>
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
                          Klik untuk upload gambar
                        </span>
                      </label>
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF hingga 10MB
                    </p>
                  </div>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Upload ${index + 1}`}
                          className="max-w-full h-auto rounded-lg"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{sections.product.form.details.fields.name.label}</Label>
                      <Input
                        type="text"
                        value={detail.name}
                        onChange={(e) => updateDetail(index, 'name', e.target.value)}
                        placeholder={sections.product.form.details.fields.name.placeholder}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{sections.product.form.details.fields.value.label}</Label>
                      <Input
                        type="text"
                        value={detail.value}
                        onChange={(e) => updateDetail(index, 'value', e.target.value)}
                        placeholder={sections.product.form.details.fields.value.placeholder}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{sections.product.form.details.fields.images.label}</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-2">
                          <label className="cursor-pointer">
                            <span className="text-[#03438f] hover:text-[#012f65]">
                              Upload gambar detail
                            </span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => e.target.files && handleDetailImageUpload(index, e.target.files)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {detail.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {detail.images.map((image, imageIndex) => (
                          <div key={imageIndex} className="relative">
                            <img
                              src={image}
                              alt={`Detail ${index + 1} - ${imageIndex + 1}`}
                              className="max-w-full h-auto rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeDetailImage(index, imageIndex)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-4 pt-6">
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#03438f] hover:bg-[#012f65] text-white"
              >
                {loading ? 'Menyimpan...' : productContent.actions.save}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                {productContent.actions.cancel}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}
