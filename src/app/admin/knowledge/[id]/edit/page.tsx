"use client"

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Plus, Trash2 } from 'lucide-react'

export default function EditKnowledgePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams() as { id?: string }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [updatedBy, setUpdatedBy] = useState('')
  const [updateNotes, setUpdateNotes] = useState('')
  const [logoFiles, setLogoFiles] = useState<File[]>([])
  const [details, setDetails] = useState<Array<{ id: string; name: string; description: string; logos?: string[]; logo?: string; logoFile?: File; logoFiles?: File[] }>>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session || ((session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN')) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    const id = params?.id
    if (!id) return
    const fetchItem = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/knowledge/${id}`)
        if (!res.ok) throw new Error('Failed to fetch knowledge')
        const item = await res.json()
        setData(item)
        setTitle(item.title || '')
        setDescription(item.description || '')
        setDetails((item.detailKnowledges || []).map((d: any) => ({ id: d.id, name: d.name || '', description: d.description || '', logos: d.logos || [], logo: d.logos?.[0] || undefined })))
      } catch (e: any) {
        setError(e.message || 'Error')
      } finally {
        setLoading(false)
      }
    }
    fetchItem()
  }, [params?.id])

  const addDetail = () => {
    setDetails(prev => ([...prev, { id: Math.random().toString(36).slice(2), name: '', description: '' }]))
  }
  const removeDetail = (id: string) => {
    setDetails(prev => prev.filter(d => d.id !== id))
  }
  const updateDetail = (id: string, field: 'name' | 'description' | 'logoFile', value: any) => {
    setDetails(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!params?.id) return
    try {
      const fd = new FormData()
      fd.append('id', params.id)
      fd.append('title', title)
      fd.append('description', description)
      if (updatedBy) fd.append('updatedBy', updatedBy)
      if (updateNotes) fd.append('updateNotes', updateNotes)
      if (logoFiles.length) {
        fd.append('logo', logoFiles[0])
        logoFiles.forEach((f, i) => { if (i > 0) fd.append(`logo_${i - 1}`, f) })
      }
      const detailsMinimal = details.map((d, idx) => {
        if (d.logoFiles?.length) {
          fd.append(`detailLogo_${idx}`, d.logoFiles[0])
          d.logoFiles.forEach((f, j) => { if (j > 0) fd.append(`detailLogo_${idx}_${j - 1}`, f) })
        }
        return { index: idx, name: d.name, description: d.description, existingLogoUrl: d.logo || null }
      })
      fd.append('details', JSON.stringify(detailsMinimal))
      const res = await fetch('/api/knowledge', { method: 'PUT', body: fd })
      if (!res.ok) throw new Error('Failed to update')
      router.push('/admin/knowledge')
    } catch (e) {
      setError('Gagal menyimpan perubahan')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    )
  }
  if (!session) return null

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Knowledge</h1>
          <p className="text-gray-600">Perbarui data knowledge di bawah ini.</p>
        </div>
        {error && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>)}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Nama Knowledge *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masukkan nama knowledge" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Deskripsi *</Label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent resize-none" placeholder="Masukkan deskripsi lengkap" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Diupdate oleh *</Label>
                <Input value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} placeholder="Nama admin yang mengedit" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Catatan Update</Label>
                <textarea 
                  value={updateNotes} 
                  onChange={(e) => setUpdateNotes(e.target.value)} 
                  rows={3} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent resize-none" 
                  placeholder="Catatan perubahan yang dilakukan (opsional)" 
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Logo Knowledge</Label>
              <div className="relative">
                <input id="logo" type="file" multiple accept="image/*" onChange={(e) => setLogoFiles(Array.from(e.target.files || []))} className="hidden" />
                <label htmlFor="logo" className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200">
                  <div className="p-3 bg-gray-100 rounded-full">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-sm font-medium text-gray-900">{logoFiles.length ? `${logoFiles.length} file dipilih` : 'Klik untuk upload logo'}</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF hingga 10MB</p>
                  </div>
                </label>
              </div>
              {(logoFiles.length || data?.logos?.length) ? (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-3">
                  {logoFiles.length
                    ? logoFiles.map((f, idx) => (
                        <img key={idx} src={URL.createObjectURL(f)} alt="Preview" className="w-full h-auto object-contain rounded border" />
                      ))
                    : (data?.logos || []).map((u: string, idx: number) => (
                        <img key={idx} src={u} alt="Preview" className="w-full h-auto object-contain rounded border" />
                      ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Detail Knowledge</h2>
              <Button type="button" variant="outline" className="text-[#03438f] border-[#03438f]" onClick={addDetail}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Detail
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {details.map((d, i) => (
                <div key={d.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Detail {i + 1}</h3>
                    <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => removeDetail(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Nama Detail</Label>
                      <Input value={d.name} onChange={(e) => updateDetail(d.id, 'name', e.target.value)} placeholder="Masukkan nama detail" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Deskripsi Detail</Label>
                      <textarea value={d.description} onChange={(e) => updateDetail(d.id, 'description', e.target.value)} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent resize-none" placeholder="Masukkan deskripsi detail (bisa paste panjang dan multi-baris)" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Logo Detail</Label>
                    <div className="relative">
                      <input id={`detail-logo-${d.id}`} type="file" multiple accept="image/*" onChange={(e) => updateDetail(d.id, 'logoFiles', Array.from(e.target.files || []))} className="hidden" />
                      <label htmlFor={`detail-logo-${d.id}`} className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200">
                        <Upload className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          {d.logoFiles?.length 
                            ? `${d.logoFiles.length} file baru dipilih` 
                            : d.logos?.length 
                              ? `Ada ${d.logos.length} logo - Upload logo tambahan (opsional)`
                              : 'Upload logo detail (opsional)'
                          }
                        </span>
                      </label>
                    </div>
                    {(d.logoFiles?.length || d.logos?.length) ? (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                        {/* Show existing logos */}
                        {d.logos?.map((logoUrl, idx) => (
                          <div key={`existing-${idx}`} className="relative">
                            <img src={logoUrl} alt="Preview" className="w-full h-auto object-contain rounded border" />
                            <div className="text-xs text-gray-600 mt-1">Logo {idx + 1}</div>
                          </div>
                        ))}
                        {/* Show new uploaded files */}
                        {d.logoFiles?.map((f, idx) => (
                          <div key={`new-${idx}`} className="relative">
                            <img src={URL.createObjectURL(f)} alt="Preview" className="w-full h-auto object-contain rounded border" />
                            <div className="text-xs text-gray-600 mt-1">{((f.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                        ))}
                        {(d.logos?.length || d.logoFiles?.length) && (
                          <div className="col-span-full flex justify-end">
                            <button type="button" className="text-red-500 hover:text-red-700" onClick={() => updateDetail(d.id, 'logoFiles', [])}>Hapus file baru</button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/knowledge')}>Batal</Button>
            <Button type="submit" className="bg-[#03438f] text-white">Simpan</Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}


