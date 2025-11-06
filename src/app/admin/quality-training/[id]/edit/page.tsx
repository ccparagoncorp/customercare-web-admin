'use client'

import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import qtContent from "@/content/quality-training.json"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload } from "lucide-react"
import { uploadQTFile } from "@/lib/supabase-storage"

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

type UploadResult = { url: string; error: null } | { url: null; error: string }

export default function EditQualityTraining() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams() as { id?: string }
  const id = params?.id as string
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    logos: '',
    updatedBy: '',
    updateNotes: ''
  })
  const [logoFiles, setLogoFiles] = useState<File[]>([])
  const parseUrls = (s?: string) => (s ? s.split(',').map(v => v.trim()).filter(Boolean) : [])
  const removeUrlAt = (idx: number) => {
    const arr = parseUrls(formData.logos)
    arr.splice(idx, 1)
    setFormData(prev => ({ ...prev, logos: arr.join(', ') }))
  }

  const handleLogosUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const fileArr = Array.from(files)
      setLogoFiles(prev => [...prev, ...fileArr])
      const urls: string[] = []
      for (const file of fileArr) {
        const res: UploadResult = await uploadQTFile(file as File, 'quality-training')
        if (res.url) urls.push(res.url)
        else if (res.error) alert(res.error)
      }
      setFormData(prev => ({
        ...prev,
        logos: [prev.logos, urls.join(', ')].filter(Boolean).join(', ')
      }))
    } catch (error) {
      console.error(error)
      alert('Gagal upload gambar')
    }
  }

  const loadData = useCallback(async (itemId: string) => {
    try {
      const res = await fetch(`/api/quality-training/${itemId}`)
      if (res.ok) {
        const data = await res.json()
        const user = session?.user as UserWithRole | undefined
        setFormData({
          title: data.title || '',
          description: data.description || '',
          logos: Array.isArray(data.logos) ? data.logos.join(', ') : '',
          updatedBy: data.updatedBy || user?.email || '',
          updateNotes: data.updateNotes || ''
        })
      }
    } catch (e) { console.error(e) }
    finally { setInitialLoading(false) }
  }, [session])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    const user = session.user as UserWithRole
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
      router.push('/login'); return
    }
    if (id) loadData(id)
  }, [session, status, router, id, loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setLoading(true)
    try {
      const response = await fetch(`/api/quality-training/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          logos: formData.logos.split(',').map(s => s.trim()).filter(Boolean),
          updatedBy: formData.updatedBy,
          updateNotes: formData.updateNotes
        })
      })
      if (response.ok) {
        alert(qtContent.messages.itemUpdated)
        router.push('/admin/quality-training?tab=qualityTraining')
      } else {
        const err = await response.json(); alert(err.error || 'Error updating Quality & Training')
      }
    } catch (error) {
      console.error('Error updating Quality & Training:', error)
      alert('Error updating Quality & Training')
    } finally { setLoading(false) }
  }

  if (status === 'loading' || initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold mb-2">Edit Quality & Training</h1>
              <p className="text-blue-100 text-lg">Ubah entri Quality & Training</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Judul</Label>
              <Input id="title" type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Masukkan judul" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Masukkan deskripsi"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logos">Gambar</Label>
              <div className="relative">
                <input id="logos" type="file" accept="image/*" multiple onChange={(e) => handleLogosUpload(e.target.files)} className="hidden" />
                <label htmlFor="logos" className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200 group">
                  <div className="p-3 bg-gray-100 rounded-full group-hover:bg-[#03438f]/10 transition-colors">
                    <Upload className="h-6 w-6 text-gray-400 group-hover:text-[#03438f] transition-colors" />
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-sm font-medium text-gray-900">{logoFiles.length ? `${logoFiles.length} file dipilih` : 'Klik untuk upload gambar'}</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG hingga 10MB</p>
                  </div>
                </label>
              </div>
              {logoFiles.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-3">
                  {logoFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded border bg-white"
                      style={{
                        backgroundImage: `url(${URL.createObjectURL(f)})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        aspectRatio: '16/9',
                      }}
                    >
                      <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded flex items-center justify-center">
                        <button
                          type="button"
                          aria-label="Hapus gambar"
                          onClick={() => setLogoFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-2 text-xs text-gray-600 bg-white/70 px-1 rounded">{(f.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  ))}
                  <div className="col-span-full flex justify-end">
                    <button type="button" className="text-red-500 hover:text-red-700" onClick={() => setLogoFiles([])}>Hapus semua</button>
                  </div>
                </div>
              )}
              {/* Existing URL previews */}
              {parseUrls(formData.logos).length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-3">
                  {parseUrls(formData.logos).map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded border bg-white"
                      style={{
                        backgroundImage: `url(${url})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        aspectRatio: '16/9',
                      }}
                    >
                      <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded flex items-center justify-center">
                        <button
                          type="button"
                          aria-label="Hapus gambar"
                          onClick={() => removeUrlAt(idx)}
                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="updatedBy">Diupdate Oleh</Label>
                <Input id="updatedBy" type="text" value={formData.updatedBy} onChange={(e) => setFormData(prev => ({ ...prev, updatedBy: e.target.value }))} placeholder="Nama/Email" />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="updateNotes">Catatan Update</Label>
                <Input id="updateNotes" type="text" value={formData.updateNotes} onChange={(e) => setFormData(prev => ({ ...prev, updateNotes: e.target.value }))} placeholder="Ringkas" />
              </div>
            </div>

            <div className="flex space-x-4 pt-6">
              <Button type="submit" disabled={loading} className="bg-[#03438f] hover:bg-[#012f65] text-white">
                {loading ? 'Menyimpan...' : qtContent.actions.save}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                {qtContent.actions.cancel}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}


