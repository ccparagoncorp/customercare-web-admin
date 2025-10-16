"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Plus, Trash2 } from 'lucide-react'

interface ProdukJenisDetailField {
  id: string
  name: string
  description: string
  logoFile?: File
}

interface JenisDetailField {
  id: string
  name: string
  description: string
  logoFile?: File
  produkJenisDetails: ProdukJenisDetailField[]
}

interface DetailField {
  id: string
  name: string
  description: string
  logoFile?: File
  jenisDetails: JenisDetailField[]
}

export default function NewKnowledgePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [logoFiles, setLogoFiles] = useState<File[]>([])
  const [createdBy, setCreatedBy] = useState("")
  const [details, setDetails] = useState<DetailField[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || ((session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN')) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  const addDetail = () => {
    setDetails(prev => ([...prev, { 
      id: Date.now().toString(), 
      name: '', 
      description: '',
      jenisDetails: []
    }]))
  }

  const removeDetail = (id: string) => {
    setDetails(prev => prev.filter(d => d.id !== id))
  }

  const updateDetail = (id: string, field: keyof DetailField, value: any) => {
    setDetails(prev => prev.map(d => d.id === id ? { ...d, [field]: value } as DetailField : d))
  }

  const addJenisDetail = (detailId: string) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { ...d, jenisDetails: [...d.jenisDetails, { 
            id: Date.now().toString(), 
            name: '', 
            description: '',
            produkJenisDetails: []
          }] }
        : d
    ))
  }

  const removeJenisDetail = (detailId: string, jenisId: string) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { ...d, jenisDetails: d.jenisDetails.filter(j => j.id !== jenisId) }
        : d
    ))
  }

  const updateJenisDetail = (detailId: string, jenisId: string, field: keyof JenisDetailField, value: any) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { 
            ...d, 
            jenisDetails: d.jenisDetails.map(j => 
              j.id === jenisId ? { ...j, [field]: value } as JenisDetailField : j
            )
          }
        : d
    ))
  }

  const addProdukJenisDetail = (detailId: string, jenisId: string) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { 
            ...d, 
            jenisDetails: d.jenisDetails.map(j => 
              j.id === jenisId 
                ? { ...j, produkJenisDetails: [...j.produkJenisDetails, { 
                    id: Date.now().toString(), 
                    name: '', 
                    description: ''
                  }] }
                : j
            )
          }
        : d
    ))
  }

  const removeProdukJenisDetail = (detailId: string, jenisId: string, produkId: string) => {
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

  const updateProdukJenisDetail = (detailId: string, jenisId: string, produkId: string, field: keyof ProdukJenisDetailField, value: any) => {
    setDetails(prev => prev.map(d => 
      d.id === detailId 
        ? { 
            ...d, 
            jenisDetails: d.jenisDetails.map(j => 
              j.id === jenisId 
                ? { 
                    ...j, 
                    produkJenisDetails: j.produkJenisDetails.map(p => 
                      p.id === produkId ? { ...p, [field]: value } as ProdukJenisDetailField : p
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
    setError(null)

    if (!title.trim() || !description.trim() || !createdBy.trim()) {
      setError('Nama, deskripsi, dan dibuat oleh wajib diisi')
      return
    }

    try {
      setIsSubmitting(true)
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('description', description)
      fd.append('createdBy', createdBy.trim())
      if (logoFiles.length > 0) {
        // first as legacy 'logo'
        fd.append('logo', logoFiles[0])
        // rest as logo_0, logo_1, ...
        logoFiles.forEach((f, i) => {
          if (i > 0) fd.append(`logo_${i - 1}`, f)
        })
      }

      const minimalDetails = details.map((d, idx) => {
        const list = (d as any).logoFiles as File[] | undefined
        if (list && list.length) {
          // first file for backward compatibility
          fd.append(`detailLogo_${idx}`, list[0])
          // others
          list.forEach((f, j) => {
            if (j > 0) fd.append(`detailLogo_${idx}_${j - 1}`, f)
          })
        }

        // Handle jenis details
        const jenisDetails = d.jenisDetails.map((j, jenisIdx) => {
          const jenisLogoFiles = (j as any).logoFiles as File[] | undefined
          if (jenisLogoFiles && jenisLogoFiles.length) {
            fd.append(`jenisLogo_${idx}_${jenisIdx}`, jenisLogoFiles[0])
            jenisLogoFiles.forEach((f, k) => {
              if (k > 0) fd.append(`jenisLogo_${idx}_${jenisIdx}_${k - 1}`, f)
            })
          }

          // Handle produk jenis details
          const produkDetails = j.produkJenisDetails.map((p, produkIdx) => {
            const produkLogoFiles = (p as any).logoFiles as File[] | undefined
            if (produkLogoFiles && produkLogoFiles.length) {
              fd.append(`produkLogo_${idx}_${jenisIdx}_${produkIdx}`, produkLogoFiles[0])
              produkLogoFiles.forEach((f, k) => {
                if (k > 0) fd.append(`produkLogo_${idx}_${jenisIdx}_${produkIdx}_${k - 1}`, f)
              })
            }
            return { name: p.name, description: p.description || '' }
          })

          return {
            name: j.name,
            description: j.description || '',
            produkJenisDetails: produkDetails
          }
        })

        return { 
          index: idx, 
          name: d.name, 
          description: d.description || '',
          jenisDetails
        }
      })
      fd.append('details', JSON.stringify(minimalDetails))

      const res = await fetch('/api/knowledge', { method: 'POST', body: fd })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message || 'Gagal menambah knowledge')
      }
      router.push('/admin/knowledge')
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading') {
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
          <h1 className="text-2xl font-bold text-gray-900">Tambah Knowledge</h1>
          <p className="text-gray-600">Isi form di bawah untuk menambahkan knowledge baru.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">Nama Knowledge *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masukkan nama knowledge" />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Deskripsi *</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  placeholder="Masukkan deskripsi lengkap (boleh paste panjang, enter untuk baris baru)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent resize-none"
                />
              </div>
              <div>
                <Label htmlFor="createdBy" className="text-sm font-medium text-gray-700">Dibuat oleh *</Label>
                <Input id="createdBy" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} placeholder="Nama admin pembuat" />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Logo Knowledge (multiple)</Label>
              <div className="relative">
                <input id="logo" type="file" multiple accept="image/*" onChange={(e) => setLogoFiles(Array.from(e.target.files || []))} className="hidden" />
                <label htmlFor="logo" className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200 group">
                  <div className="p-3 bg-gray-100 rounded-full group-hover:bg-[#03438f]/10 transition-colors">
                    <Upload className="h-6 w-6 text-gray-400 group-hover:text-[#03438f] transition-colors" />
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-sm font-medium text-gray-900">{logoFiles.length ? `${logoFiles.length} file dipilih` : 'Klik untuk upload logo'}</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF hingga 10MB</p>
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
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Detail Knowledge</h2>
              <Button type="button" variant="outline" className="text-[#03438f] border-[#03438f]" onClick={addDetail}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Detail
              </Button>
            </div>
            {details.length === 0 && (
              <p className="text-sm text-gray-500">Belum ada detail. Klik "Tambah Detail" untuk menambahkan.</p>
            )}
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
                      <textarea value={d.description} onChange={(e) => updateDetail(d.id, 'description', e.target.value)} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent resize-none" placeholder="Masukkan deskripsi detail (bisa paste panjang dan multi-baris)"></textarea>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Logo Detail</Label>
                    <div className="relative">
                      <input id={`detail-logo-${d.id}`} type="file" multiple accept="image/*" onChange={(e) => updateDetail(d.id, 'logoFiles', Array.from(e.target.files || []))} className="hidden" />
                      <label htmlFor={`detail-logo-${d.id}`} className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200">
                        <Upload className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">{(d as any).logoFiles?.length ? `${(d as any).logoFiles.length} file dipilih` : 'Upload logo detail (opsional)'}</span>
                      </label>
                    </div>
                    {(d as any).logoFiles?.length ? (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(d as any).logoFiles.map((f: File, idx: number) => (
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
                                onClick={() => updateDetail(d.id, 'logoFiles', (d as any).logoFiles.filter((_: File, i: number) => i !== idx))}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{((f.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                        ))}
                        <div className="col-span-full flex justify-end">
                          <button type="button" className="text-red-500 hover:text-red-700" onClick={() => updateDetail(d.id, 'logoFiles', [])}>Hapus semua</button>
                        </div>
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
                      <p className="text-xs text-gray-500">Belum ada jenis detail. Klik "Tambah Jenis" untuk menambahkan (opsional).</p>
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
                                  <span className="text-xs text-gray-600">{(j as any).logoFiles?.length ? `${(j as any).logoFiles.length} file` : 'Upload logo'}</span>
                                </label>
                              </div>
                            </div>
                            {(j as any).logoFiles?.length ? (
                              <div className="md:col-span-2 mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                                {(j as any).logoFiles.map((f: File, jIdx: number) => (
                                  <div
                                    key={jIdx}
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
                                        onClick={() => updateJenisDetail(d.id, j.id, 'logoFiles', (j as any).logoFiles.filter((_: File, i: number) => i !== jIdx))}
                                        className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">{((f.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
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
                              <p className="text-xs text-gray-500">Belum ada produk jenis detail. Klik "Tambah Produk" untuk menambahkan (opsional).</p>
                            )}
                            <div className="space-y-2">
                              {j.produkJenisDetails.map((p, produkIdx) => (
                                <div key={p.id} className="bg-white border border-gray-200 rounded p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-600">Produk {produkIdx + 1}</span>
                                    <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => removeProdukJenisDetail(d.id, j.id, p.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs font-medium text-gray-600">Nama Produk</Label>
                                      <Input value={p.name} onChange={(e) => updateProdukJenisDetail(d.id, j.id, p.id, 'name', e.target.value)} placeholder="Nama produk" className="text-xs" />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-medium text-gray-600">Logo Produk</Label>
                                      <div className="relative">
                                        <input id={`produk-logo-${p.id}`} type="file" multiple accept="image/*" onChange={(e) => updateProdukJenisDetail(d.id, j.id, p.id, 'logoFiles', Array.from(e.target.files || []))} className="hidden" />
                                        <label htmlFor={`produk-logo-${p.id}`} className="flex items-center justify-center w-full px-2 py-3 border border-dashed border-gray-300 rounded cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200">
                                          <Upload className="h-3 w-3 text-gray-400 mr-1" />
                                          <span className="text-xs text-gray-600">{(p as any).logoFiles?.length ? `${(p as any).logoFiles.length} file` : 'Upload'}</span>
                                        </label>
                                      </div>
                                    </div>
                                    {(p as any).logoFiles?.length ? (
                                      <div className="md:col-span-2 mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {(p as any).logoFiles.map((f: File, pIdx: number) => (
                                          <div
                                            key={pIdx}
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
                                                onClick={() => updateProdukJenisDetail(d.id, j.id, p.id, 'logoFiles', (p as any).logoFiles.filter((_: File, i: number) => i !== pIdx))}
                                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">{((f.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
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
            <Button type="submit" disabled={isSubmitting} className="bg-[#03438f] text-white">
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}



