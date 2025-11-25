'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use, useCallback } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, X, Upload } from "lucide-react"
import Image from "next/image"

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

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

export default function EditAnnouncement({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [formData, setFormData] = useState({
    judul: '',
    deskripsi: '',
    link: '',
    images: [] as string[]
  })
  const [newImages, setNewImages] = useState<File[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [removedImages, setRemovedImages] = useState<string[]>([])

  const resolvedParams = use(params)

  const fetchData = useCallback(async () => {
    try {
      setFetching(true)
      const response = await fetch(`/api/announcement/${resolvedParams.id}`)
      
      if (response.ok) {
        const data: Announcement = await response.json()
        setAnnouncement(data)
        setFormData({
          judul: data.judul,
          deskripsi: data.deskripsi || '',
          link: data.link || '',
          images: data.image || []
        })
        setPreviewImages(data.image || [])
      } else {
        router.push('/admin/announcement')
      }
    } catch (error) {
      console.error('Error fetching announcement:', error)
      router.push('/admin/announcement')
    } finally {
      setFetching(false)
    }
  }, [resolvedParams.id, router])

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    setNewImages(prev => [...prev, ...newFiles])

    // Create preview URLs
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImages(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeExistingImage = (index: number) => {
    const imageToRemove = formData.images[index]
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
    setPreviewImages(prev => prev.filter((_, i) => i !== index))
    setRemovedImages(prev => [...prev, imageToRemove])
  }

  const removeNewImage = (index: number) => {
    // Find the actual index in previewImages (after existing images)
    const actualIndex = formData.images.length + index
    setNewImages(prev => prev.filter((_, i) => i !== index))
    setPreviewImages(prev => prev.filter((_, i) => i !== actualIndex))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('judul', formData.judul)
      formDataToSend.append('deskripsi', formData.deskripsi)
      formDataToSend.append('link', formData.link)
      formDataToSend.append('removedImages', JSON.stringify(removedImages))

      // Append new images
      newImages.forEach((image, index) => {
        formDataToSend.append(`image_${index}`, image)
      })

      const response = await fetch(`/api/announcement/${resolvedParams.id}`, {
        method: 'PUT',
        body: formDataToSend
      })

      if (response.ok) {
        alert('Announcement berhasil diupdate!')
        router.push('/admin/announcement')
      } else {
        const error = await response.json()
        alert(error.error || 'Error updating announcement')
      }
    } catch (error) {
      console.error('Error updating announcement:', error)
      alert('Error updating announcement')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || !announcement) {
    return null
  }

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
              <h1 className="text-3xl font-bold mb-2">Edit Announcement</h1>
              <p className="text-blue-100 text-lg">Edit announcement yang sudah ada</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="judul">Judul *</Label>
              <Input
                id="judul"
                type="text"
                value={formData.judul}
                onChange={(e) => setFormData(prev => ({ ...prev, judul: e.target.value }))}
                placeholder="Masukkan judul announcement"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
                placeholder="Masukkan deskripsi announcement"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Link</Label>
              <Input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                placeholder="https://contoh-link.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="images">Gambar</Label>
              
              {/* Existing Images */}
              {formData.images.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Gambar yang sudah ada:</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {formData.images.map((img, index) => (
                      img && (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                            <Image
                              src={img}
                              alt={`Existing ${index + 1}`}
                              width={100}
                              height={100}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Upload New Images */}
              <div className="mt-2">
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Klik untuk upload</span> atau drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF (MAX. 10MB)</p>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                  />
                </label>
              </div>

              {/* Preview New Images */}
              {newImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Gambar baru:</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {newImages.map((_, index) => {
                      const previewIndex = formData.images.length + index
                      const previewSrc = previewImages[previewIndex]
                      return (
                        previewSrc && (
                          <div key={index} className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                              <Image
                                src={previewSrc}
                                alt={`New ${index + 1}`}
                                width={100}
                                height={100}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-6">
              <Button
                type="submit"
                disabled={loading || uploading}
                className="bg-[#03438f] hover:bg-[#012f65] text-white"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading || uploading}
              >
                Batal
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

