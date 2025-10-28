'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import productContent from "@/content/product.json"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, X } from "lucide-react"

interface Brand {
  id: string
  name: string
  description?: string
  images: string[]
  colorbase?: string
}

export default function EditBrand({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    images: [] as string[],
    colorbase: '#03438f',
    updateNotes: ''
  })

  const resolvedParams = use(params)

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

    fetchBrand()
  }, [session, status, router, resolvedParams.id])

  const fetchBrand = async () => {
    try {
      const response = await fetch(`/api/brand/${resolvedParams.id}`)
      if (response.ok) {
        const brandData = await response.json()
        setBrand(brandData)
        setFormData({
          name: brandData.name,
          description: brandData.description || '',
          images: brandData.images || [],
          colorbase: brandData.colorbase || '#03438f'
        })
      } else {
        router.push('/admin/products')
      }
    } catch (error) {
      console.error('Error fetching brand:', error)
      router.push('/admin/products')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/brand/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert(productContent.messages.itemUpdated)
        router.push('/admin/products?tab=brand')
      } else {
        const error = await response.json()
        alert(error.error || 'Error updating brand')
      }
    } catch (error) {
      console.error('Error updating brand:', error)
      alert('Error updating brand')
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
        formData.append('path', 'brands')

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

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || !brand) {
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
              <h1 className="text-3xl font-bold mb-2">{sections.brand.form.title.edit}</h1>
              <p className="text-blue-100 text-lg">Edit brand: {brand.name}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">{sections.brand.form.fields.name.label}</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={sections.brand.form.fields.name.placeholder}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{sections.brand.form.fields.description.label}</Label>
                <Input
                  id="description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={sections.brand.form.fields.description.placeholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorbase">Base Color</Label>
                <div className="flex items-center space-x-3">
                  <input
                    id="colorbase"
                    type="color"
                    value={formData.colorbase}
                    onChange={(e) => setFormData(prev => ({ ...prev, colorbase: e.target.value }))}
                    className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.colorbase}
                    onChange={(e) => setFormData(prev => ({ ...prev, colorbase: e.target.value }))}
                    placeholder="#03438f"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500">Pilih warna dasar untuk brand ini</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="updateNotes">Update Notes</Label>
                <textarea
                  id="updateNotes"
                  value={formData.updateNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, updateNotes: e.target.value }))}
                  placeholder="Catatan perubahan (opsional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{sections.brand.form.fields.images.label}</Label>
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
