'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use, useCallback } from 'react'
import Image from 'next/image'
import { AdminLayout } from "@/components/admin/AdminLayout"
import sopContent from "@/content/sop.json"
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

interface KategoriSOP {
  id: string
  name: string
}

interface SOP {
  id: string
  name: string
  kategoriSOP: KategoriSOP
}

interface DetailSOP {
  id?: string
  name: string
  value: string
}

interface JenisSOP {
  id: string
  name: string
  content?: string
  link?: string
  images?: string[]
  sopId: string
  detailSOPs?: DetailSOP[]
  sop?: {
    kategoriSOP: KategoriSOP
  }
}

export default function EditJenisSOP({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [jenisSOP, setJenisSOP] = useState<JenisSOP | null>(null)
  const [kategoriSOPs, setKategoriSOPs] = useState<KategoriSOP[]>([])
  const [sops, setSOPs] = useState<SOP[]>([])
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    link: '',
    images: [] as string[],
    sopId: '',
    details: [] as DetailSOP[],
    updatedBy: '',
    updateNotes: ''
  })
  const [selectedKategoriSOPId, setSelectedKategoriSOPId] = useState('')

  const resolvedParams = use(params)

  const fetchData = useCallback(async () => {
    try {
      const [jenisSOPRes, kategoriSOPRes, sopsRes] = await Promise.all([
        fetch(`/api/jenis-sop/${resolvedParams.id}`),
        fetch('/api/kategori-sop'),
        fetch('/api/sop')
      ])

      if (jenisSOPRes.ok) {
        const data: JenisSOP = await jenisSOPRes.json()
        setJenisSOP(data)
        const user = session?.user as UserWithRole | undefined
        setFormData({
          name: data.name,
          content: data.content || '',
          link: data.link || '',
          images: data.images || [],
          sopId: data.sopId,
          details: data.detailSOPs || [],
          updatedBy: user?.email || '',
          updateNotes: ''
        })
        // Set selected kategori from the SOP's kategoriSOP
        if (data.sop && data.sop.kategoriSOP) {
          setSelectedKategoriSOPId(data.sop.kategoriSOP.id)
        }
      }

      if (kategoriSOPRes.ok) {
        const data = await kategoriSOPRes.json()
        setKategoriSOPs(data)
      }

      if (sopsRes.ok) {
        const data = await sopsRes.json()
        setSOPs(data)
      }

      if (!jenisSOPRes.ok) {
        router.push('/admin/sop')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      router.push('/admin/sop')
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
      const response = await fetch(`/api/jenis-sop/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert(sopContent.messages.itemUpdated)
        router.push('/admin/sop?tab=jenisSOP')
      } else {
        const error = await response.json()
        alert(error.error || 'Error updating jenis SOP')
      }
    } catch (error) {
      console.error('Error updating jenis SOP:', error)
      alert('Error updating jenis SOP')
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
        formData.append('path', 'jenis-sop')

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
      details: [...prev.details, { name: '', value: '' }]
    }))
  }

  const removeDetail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }))
  }

  const updateDetail = (index: number, field: keyof DetailSOP, value: string) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map((detail, i) => 
        i === index ? { ...detail, [field]: value } : detail
      )
    }))
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || !jenisSOP) {
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
              <h1 className="text-3xl font-bold mb-2">Edit Jenis SOP</h1>
              <p className="text-blue-100 text-lg">Edit jenis SOP: {jenisSOP.name}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Edit Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Informasi Edit</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="updatedBy">Diupdate Oleh *</Label>
                  <Input
                    id="updatedBy"
                    type="text"
                    value={formData.updatedBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, updatedBy: e.target.value }))}
                    placeholder="Masukkan nama yang mengupdate"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="updateNotes">Catatan Update *</Label>
                  <textarea
                    id="updateNotes"
                    value={formData.updateNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, updateNotes: e.target.value }))}
                    placeholder="Masukkan catatan perubahan yang dilakukan"
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
                  <Label htmlFor="name">Nama Jenis SOP</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Masukkan nama jenis SOP"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kategoriSOP">Kategori SOP</Label>
                  <select
                    id="kategoriSOP"
                    value={selectedKategoriSOPId}
                    onChange={(e) => {
                      setSelectedKategoriSOPId(e.target.value)
                      setFormData(prev => ({ ...prev, sopId: '' }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                    required
                  >
                    <option value="">Pilih Kategori SOP</option>
                    {kategoriSOPs.map((kategoriSOP) => (
                      <option key={kategoriSOP.id} value={kategoriSOP.id}>
                        {kategoriSOP.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sopId">Nama SOP</Label>
                <select
                  id="sopId"
                  value={formData.sopId}
                  onChange={(e) => setFormData(prev => ({ ...prev, sopId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent disabled:text-gray-400 disabled:bg-gray-50"
                  required
                  disabled={!kategoriSOPs.some(kat => kat.id === selectedKategoriSOPId) || !sops.some(sop => sop.kategoriSOP.id === selectedKategoriSOPId)}
                >
                  <option value="">
                    {sops.some(sop => sop.kategoriSOP.id === selectedKategoriSOPId)
                      ? 'Pilih Nama SOP'
                      : selectedKategoriSOPId
                      ? 'Tidak ada Nama SOP'
                      : 'Pilih Nama SOP'}
                  </option>
                  {sops
                    .filter(sop => !selectedKategoriSOPId || sop.kategoriSOP.id === selectedKategoriSOPId)
                    .map((sop) => (
                      <option key={sop.id} value={sop.id}>
                        {sop.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Konten</Label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Masukkan konten jenis SOP"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link">Link Jenis SOP</Label>
                <Input
                  id="link"
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="https://contoh-link-jenis-sop.com"
                />
              </div>
            </div>

            {/* Images */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Gambar Jenis SOP</h3>
              
              <div className="space-y-2">
                <Label>Upload Gambar</Label>
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
                        disabled={uploading}
                      />
                      {uploading && (
                        <div className="flex items-center justify-center space-x-2 mt-2">
                          <div className="w-4 h-4 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </div>
                      )}
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
                        <Image
                          src={image}
                          alt={`Upload ${index + 1}`}
                          width={200}
                          height={200}
                          className="max-w-full h-auto rounded-lg object-contain"
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

            {/* Details */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Detail SOP</h3>
                <Button
                  type="button"
                  onClick={addDetail}
                  className="flex items-center space-x-2 bg-[#03438f] hover:bg-[#012f65] text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Detail</span>
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

                  <div className="space-y-2">
                    <Label>Nama Detail</Label>
                    <Input
                      type="text"
                      value={detail.name}
                      onChange={(e) => updateDetail(index, 'name', e.target.value)}
                      placeholder="Masukkan nama detail"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <textarea
                      value={detail.value}
                      onChange={(e) => updateDetail(index, 'value', e.target.value)}
                      placeholder="Masukkan value detail"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                      rows={4}
                    />
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
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                {sopContent.actions.cancel}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

