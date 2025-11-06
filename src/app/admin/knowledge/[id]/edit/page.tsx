"use client"

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

interface KnowledgeData {
  id?: string
  title?: string
  description?: string
  logos?: string[]
  detailKnowledges?: Array<{
    id: string
    name?: string
    description?: string
    logos?: string[]
    jenisDetailKnowledges?: Array<{
      id: string
      name?: string
      description?: string
      logos?: string[]
      produkJenisDetailKnowledges?: Array<{
        id: string
        name?: string
        description?: string
        logos?: string[]
      }>
    }>
  }>
}

// Component untuk menangani error loading gambar (tanpa console log)
function ImageWithFallback({ src, alt, className, onError }: { src: string, alt: string, className: string, onError: () => void }) {
  const [hasError, setHasError] = useState(false)
  
  if (hasError || !src) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center rounded border`}>
        <div className="text-center text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs">Gambar tidak dapat dimuat</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: 'auto' }}>
      <Image
        src={src}
        alt={alt}
        width={400}
        height={300}
        className="w-full h-auto object-contain rounded border"
        style={{ maxWidth: '100%', height: 'auto' }}
        unoptimized
        onLoadingComplete={() => {
          // Image loaded successfully
        }}
        onError={() => {
          setHasError(true)
          onError()
        }}
      />
    </div>
  )
}

export default function EditKnowledgePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams() as { id?: string }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<KnowledgeData | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [updatedBy, setUpdatedBy] = useState('')
  const [updateNotes, setUpdateNotes] = useState('')
  const [logoFiles, setLogoFiles] = useState<File[]>([])
  const [removedLogos, setRemovedLogos] = useState<string[]>([])
  const [removedDetailLogos, setRemovedDetailLogos] = useState<Array<{ detailId: string, logos: string[] }>>([])
  const [removedJenisLogos, setRemovedJenisLogos] = useState<Array<{ jenisId: string, logos: string[] }>>([])
  const [removedProdukLogos, setRemovedProdukLogos] = useState<Array<{ produkId: string, logos: string[] }>>([])
  const [details, setDetails] = useState<Array<{ 
    id: string; 
    name: string; 
    description: string; 
    logos?: string[]; 
    logo?: string; 
    logoFile?: File; 
    logoFiles?: File[];
    jenisDetails: Array<{
      id?: string;
      name: string;
      description: string;
      logos?: string[];
      logoFile?: File;
      logoFiles?: File[];
      produkJenisDetails: Array<{
        id?: string;
        name: string;
        description: string;
        logos?: string[];
        logoFile?: File;
        logoFiles?: File[];
      }>;
    }>;
  }>>([])

  useEffect(() => {
    if (status === 'loading') return
    const user = session?.user as UserWithRole | undefined
    if (!session || (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN')) {
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
        
        setDetails((item.detailKnowledges || []).map((d: { id: string; name?: string; description?: string; logos?: string[]; jenisDetailKnowledges?: Array<{ id: string; name?: string; description?: string; logos?: string[]; produkJenisDetailKnowledges?: Array<{ id: string; name?: string; description?: string; logos?: string[] }> }> }) => ({ 
          id: d.id, 
          name: d.name || '', 
          description: d.description || '', 
          logos: d.logos || [], 
          logo: d.logos?.[0] || undefined,
          jenisDetails: (d.jenisDetailKnowledges || []).map((j: { id: string; name?: string; description?: string; logos?: string[]; produkJenisDetailKnowledges?: Array<{ id: string; name?: string; description?: string; logos?: string[] }> }) => ({
            id: j.id,
            name: j.name || '',
            description: j.description || '',
            logos: j.logos || [],
            produkJenisDetails: (j.produkJenisDetailKnowledges || []).map((p: { id: string; name?: string; description?: string; logos?: string[] }) => ({
              id: p.id,
              name: p.name || '',
              description: p.description || '',
              logos: p.logos || []
            }))
          }))
        })))
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Error')
      } finally {
        setLoading(false)
      }
    }
    fetchItem()
  }, [params?.id])

  const addDetail = () => {
    setDetails(prev => ([...prev, { 
      id: Math.random().toString(36).slice(2), 
      name: '', 
      description: '',
      jenisDetails: []
    }]))
  }
  const removeDetail = (id: string) => {
    setDetails(prev => prev.filter(d => d.id !== id))
  }
  const updateDetail = (id: string, field: 'name' | 'description' | 'logoFile' | 'logoFiles' | 'logos', value: string | File | File[] | string[]) => {
    setDetails(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  const addJenisDetail = (detailId: string) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { ...d, jenisDetails: [...d.jenisDetails, { 
            id: Math.random().toString(36).slice(2), 
            name: '', 
            description: '',
            produkJenisDetails: []
          }] }
        : d
    ))
  }

  const removeJenisDetail = (detailId: string, jenisId?: string) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { ...d, jenisDetails: d.jenisDetails.filter(j => j.id !== jenisId) }
        : d
    ))
  }

  const updateJenisDetail = (detailId: string, jenisId: string | undefined, field: string, value: string | File | File[] | string[]) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { 
            ...d, 
            jenisDetails: d.jenisDetails.map(j => 
              j.id === jenisId ? { ...j, [field]: value } : j
            )
          }
        : d
    ))
  }

  const addProdukJenisDetail = (detailId: string, jenisId?: string) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { 
            ...d, 
            jenisDetails: d.jenisDetails.map(j => 
              j.id === jenisId 
                ? { ...j, produkJenisDetails: [...j.produkJenisDetails, { 
                    id: Math.random().toString(36).slice(2), 
                    name: '', 
                    description: ''
                  }] }
                : j
            )
          }
        : d
    ))
  }

  const removeProdukJenisDetail = (detailId: string, jenisId?: string, produkId?: string) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { 
            ...d, 
            jenisDetails: d.jenisDetails.map(j => 
              j.id === jenisId 
                ? { ...j, produkJenisDetails: j.produkJenisDetails.filter(p => p.id !== produkId) }
                : j
            )
          }
        : d
    ))
  }

  const updateProdukJenisDetail = (detailId: string, jenisId: string | undefined, produkId: string | undefined, field: string, value: string | File | File[] | string[]) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { 
            ...d, 
            jenisDetails: d.jenisDetails.map(j => 
              j.id === jenisId
                ? { 
                    ...j, 
                    produkJenisDetails: j.produkJenisDetails.map(p => 
                      p.id === produkId ? { ...p, [field]: value } : p
                    )
                  }
                : j
            )
          }
        : d
    ))
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

        // Handle jenis details
        const jenisDetails = d.jenisDetails.map((j, jenisIdx) => {
          if (j.logoFiles?.length) {
            fd.append(`jenisLogo_${idx}_${jenisIdx}`, j.logoFiles[0])
            j.logoFiles.forEach((f, k) => { if (k > 0) fd.append(`jenisLogo_${idx}_${jenisIdx}_${k - 1}`, f) })
          }

          // Handle produk jenis details
          const produkDetails = j.produkJenisDetails.map((p, produkIdx) => {
            if (p.logoFiles?.length) {
              fd.append(`produkLogo_${idx}_${jenisIdx}_${produkIdx}`, p.logoFiles[0])
              p.logoFiles.forEach((f, l) => { if (l > 0) fd.append(`produkLogo_${idx}_${jenisIdx}_${produkIdx}_${l - 1}`, f) })
            }
            return { name: p.name, description: p.description }
          })

          return {
            name: j.name,
            description: j.description,
            produkJenisDetails: produkDetails
          }
        })

        return { 
          index: idx, 
          name: d.name, 
          description: d.description, 
          existingLogoUrl: d.logo || null,
          jenisDetails
        }
      })
      fd.append('details', JSON.stringify(detailsMinimal))
      fd.append('removedLogos', JSON.stringify(removedLogos))
      fd.append('removedDetailLogos', JSON.stringify(removedDetailLogos))
      fd.append('removedJenisLogos', JSON.stringify(removedJenisLogos))
      fd.append('removedProdukLogos', JSON.stringify(removedProdukLogos))
      const res = await fetch('/api/knowledge', { method: 'PUT', body: fd })
      if (!res.ok) throw new Error('Failed to update')
      router.push('/admin/knowledge')
    } catch {
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
                <Input value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} placeholder="Nama admin yang mengedit" required />
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
                  {/* Show existing logos with delete button */}
                  {(data?.logos || []).map((u: string, idx: number) => (
                    <div key={`existing-${idx}`} className="relative group">
                      <ImageWithFallback
                        src={u}
                        alt="Preview"
                        className="w-full h-auto object-contain rounded border"
                        onError={() => {}}
                      />
                      <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            const logoUrl = (data?.logos || [])[idx]
                            setRemovedLogos(prev => [...prev, logoUrl])
                            const newLogos = (data?.logos || []).filter((_logo: string, i: number) => i !== idx)
                            setData({ ...data, logos: newLogos })
                          }}
                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Logo {idx + 1}</div>
                    </div>
                  ))}
                  {/* Show new uploaded files */}
                  {logoFiles.map((f, idx) => (
                    <div
                      key={`new-${idx}`}
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
                          onClick={() => setLogoFiles((prev: File[]) => prev.filter((_file: File, i: number) => i !== idx))}
                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-2 text-xs text-gray-600 bg-white/70 px-1 rounded">{((f.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
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
                        {/* Show existing logos with delete button */}
                        {d.logos?.map((logoUrl: string, idx: number) => (
                          <div key={`existing-${idx}`} className="relative group">
                            <ImageWithFallback
                              src={logoUrl}
                              alt="Preview"
                              className="w-full h-auto object-contain rounded border"
                              onError={() => {}}
                            />
                            <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded flex items-center justify-center">
                            <button
                                type="button"
                                onClick={() => {
                              const logoUrl = (d.logos || [])[idx] as string
                              setRemovedDetailLogos(prev => [...prev, { detailId: d.id, logos: [logoUrl] }])
                              const newLogos = (d.logos || []).filter((_logo: string, i: number) => i !== idx)
                                  updateDetail(d.id, 'logos', newLogos)
                                }}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">Logo {idx + 1}</div>
                          </div>
                        ))}
                        {/* Show new uploaded files */}
                        {d.logoFiles?.map((f: File, idx: number) => (
                          <div
                            key={`new-${idx}`}
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
                                onClick={() => {
                                  const newFiles = (d.logoFiles || []).filter((_: File, i: number) => i !== idx)
                                  updateDetail(d.id, 'logoFiles', newFiles)
                                }}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="absolute bottom-1 left-2 text-xs text-gray-600 bg-white/70 px-1 rounded">{((f.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Jenis Details Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">Jenis Detail</h4>
                      <Button type="button" variant="outline" size="sm" className="text-[#03438f] border-[#03438f]" onClick={() => addJenisDetail(d.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Tambah Jenis
                      </Button>
                    </div>
                    {d.jenisDetails.length === 0 && (
                      <p className="text-xs text-gray-500">Belum ada jenis detail. Klik &quot;Tambah Jenis&quot; untuk menambahkan (opsional).</p>
                    )}
                    <div className="space-y-3">
                      {d.jenisDetails.map((j, jenisIdx) => (
                        <div key={j.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-medium text-gray-600">Jenis {jenisIdx + 1}</h5>
                            <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => removeJenisDetail(d.id, j.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs font-medium text-gray-600">Nama Jenis</Label>
                              <Input value={j.name} onChange={(e) => updateJenisDetail(d.id, j.id, 'name', e.target.value)} placeholder="Nama jenis detail" className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-gray-600">Logo Jenis</Label>
                              <div className="relative">
                                <input id={`jenis-logo-${j.id}`} type="file" multiple accept="image/*" onChange={(e) => updateJenisDetail(d.id, j.id, 'logoFiles', Array.from(e.target.files || []))} className="hidden" />
                                <label htmlFor={`jenis-logo-${j.id}`} className="flex items-center justify-center w-full px-3 py-4 border border-dashed border-gray-300 rounded cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200">
                                  <Upload className="h-3 w-3 text-gray-400 mr-2" />
                                  <span className="text-xs text-gray-600">
                                    {j.logoFiles?.length 
                                      ? `${j.logoFiles.length} file baru` 
                                      : j.logos?.length 
                                        ? `${j.logos.length} logo - Upload tambahan`
                                        : 'Upload logo'
                                    }
                                  </span>
                                </label>
                              </div>
                              {/* Preview jenis logos */}
                              {(j.logoFiles?.length || j.logos?.length) ? (
                                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {/* Show existing logos with delete button */}
                                  {j.logos?.map((logoUrl, idx) => (
                                    <div key={`existing-${idx}`} className="relative group">
                                      <ImageWithFallback
                                        src={logoUrl}
                                        alt="Preview"
                                        className="w-full h-auto object-contain rounded border"
                                        onError={() => {}}
                                      />
                                      <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded flex items-center justify-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const logoUrl = (j.logos || [])[idx]
                            setRemovedJenisLogos((prev) => [...prev, { jenisId: j.id as string, logos: [logoUrl] }])
                                            const newLogos = (j.logos || []).filter((_, i) => i !== idx)
                                            updateJenisDetail(d.id, j.id, 'logos', newLogos)
                                          }}
                                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">Logo {idx + 1}</div>
                                    </div>
                                  ))}
                                  {/* Show new uploaded files */}
                                  {j.logoFiles?.map((f, idx) => (
                                    <div
                                      key={`new-${idx}`}
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
                                          onClick={() => {
                                    const newFiles = (j.logoFiles || []).filter((_file: File, i: number) => i !== idx)
                                    updateJenisDetail(d.id, j.id as string, 'logoFiles', newFiles)
                                          }}
                                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                      <div className="absolute bottom-1 left-2 text-xs text-gray-600 bg-white/70 px-1 rounded">{((f.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-600">Deskripsi Jenis</Label>
                            <textarea value={j.description} onChange={(e) => updateJenisDetail(d.id, j.id, 'description', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03438f] focus:border-transparent resize-none text-sm" placeholder="Deskripsi jenis detail"></textarea>
                          </div>

                          {/* Produk Jenis Details Section */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h6 className="text-xs font-medium text-gray-600">Produk Jenis Detail</h6>
                              <Button type="button" variant="outline" size="sm" className="text-[#03438f] border-[#03438f]" onClick={() => addProdukJenisDetail(d.id, j.id)}>
                                <Plus className="h-3 w-3 mr-1" /> Tambah Produk
                              </Button>
                            </div>
                            {j.produkJenisDetails.length === 0 && (
                              <p className="text-xs text-gray-500">Belum ada produk jenis detail. Klik &quot;Tambah Produk&quot; untuk menambahkan (opsional).</p>
                            )}
                            <div className="space-y-2">
                              {j.produkJenisDetails.map((p, produkIdx) => (
                                <div key={p.id} className="bg-white border border-gray-200 rounded p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-600">Produk {produkIdx + 1}</span>
                              <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => removeProdukJenisDetail(d.id, j.id ? String(j.id) : '', p.id ? String(p.id) : '')}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs font-medium text-gray-600">Nama Produk</Label>
                                      <Input value={p.name} onChange={(e) => updateProdukJenisDetail(d.id, j.id as string, p.id as string, 'name', e.target.value)} placeholder="Nama produk" className="text-xs" />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-medium text-gray-600">Logo Produk</Label>
                                      <div className="relative">
                                        <input id={`produk-logo-${p.id}`} type="file" multiple accept="image/*" onChange={(e) => updateProdukJenisDetail(d.id, j.id as string, p.id as string, 'logoFiles', Array.from(e.target.files || []))} className="hidden" />
                                        <label htmlFor={`produk-logo-${p.id}`} className="flex items-center justify-center w-full px-2 py-3 border border-dashed border-gray-300 rounded cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200">
                                          <Upload className="h-3 w-3 text-gray-400 mr-1" />
                                          <span className="text-xs text-gray-600">
                                            {p.logoFiles?.length 
                                              ? `${p.logoFiles.length} file baru` 
                                              : p.logos?.length 
                                                ? `${p.logos.length} logo - Upload tambahan`
                                                : 'Upload'
                                            }
                                          </span>
                                        </label>
                                      </div>
                                      {/* Preview produk logos */}
                                      {(p.logoFiles?.length || p.logos?.length) ? (
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                          {/* Show existing logos with delete button */}
                                          {p.logos?.map((logoUrl, idx) => (
                                            <div key={`existing-${idx}`} className="relative group">
                                              <ImageWithFallback
                                                src={logoUrl}
                                                alt="Preview"
                                                className="w-full h-auto object-contain rounded border"
                                                onError={() => {}}
                                              />
                                              <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded flex items-center justify-center">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const logoUrl = (p.logos || [])[idx]
                            setRemovedProdukLogos((prev) => [...prev, { produkId: p.id as string, logos: [logoUrl] }])
                                                    const newLogos = (p.logos || []).filter((_logo: string, i: number) => i !== idx)
                                                    updateProdukJenisDetail(d.id, j.id as string, p.id as string, 'logos', newLogos)
                                                  }}
                                                  className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                                                >
                                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                  </svg>
                                                </button>
                                              </div>
                                              <div className="text-xs text-gray-500 mt-1">Logo {idx + 1}</div>
                                            </div>
                                          ))}
                                          {/* Show new uploaded files */}
                                          {p.logoFiles?.map((f, idx) => (
                                            <div
                                              key={`new-${idx}`}
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
                                                  onClick={() => {
                                                    const newFiles = (p.logoFiles || []).filter((_file: File, i: number) => i !== idx)
                                                    updateProdukJenisDetail(d.id, j.id as string, p.id as string, 'logoFiles', newFiles)
                                                  }}
                                                  className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                                                >
                                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                  </svg>
                                                </button>
                                              </div>
                                              <div className="absolute bottom-1 left-2 text-xs text-gray-600 bg-white/70 px-1 rounded">{((f.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-600">Deskripsi Produk</Label>
                                    <textarea value={p.description} onChange={(e) => updateProdukJenisDetail(d.id, j.id, p.id, 'description', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03438f] focus:border-transparent resize-none text-xs" placeholder="Deskripsi produk"></textarea>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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


