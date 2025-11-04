'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import qtContent from "@/content/quality-training.json"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react"
import { uploadQTFile } from "@/lib/supabase-storage"

interface QualityTrainingRef { id: string; title: string }

interface SubdetailState { name: string; description: string; logos: string }
interface DetailState { name: string; description: string; linkslide?: string; logos: string; subdetails: SubdetailState[] }

export default function NewJenisQualityTraining() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [qts, setQts] = useState<QualityTrainingRef[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logos: '',
    qualityTrainingId: ''
  })
  const [jenisLogoFiles, setJenisLogoFiles] = useState<File[]>([])
  const parseUrls = (s?: string) => (s ? s.split(',').map(v => v.trim()).filter(Boolean) : [])
  const removeJenisUrlAt = (idx: number) => {
    const arr = parseUrls(formData.logos)
    arr.splice(idx, 1)
    setFormData(prev => ({ ...prev, logos: arr.join(', ') }))
  }
  const removeDetailUrlAt = (detailIdx: number, idx: number) => {
    const arr = parseUrls(details[detailIdx].logos)
    arr.splice(idx, 1)
    updateDetail(detailIdx, { logos: arr.join(', ') })
  }
  const removeSubdetailUrlAt = (detailIdx: number, subIdx: number, idx: number) => {
    const arr = parseUrls(details[detailIdx].subdetails[subIdx].logos)
    arr.splice(idx, 1)
    updateSubdetail(detailIdx, subIdx, { logos: arr.join(', ') })
  }

  const handleJenisLogosUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArr = Array.from(files)
    setJenisLogoFiles(prev => [...prev, ...fileArr])
    const urls: string[] = []
    for (const file of fileArr) {
      const res = await uploadQTFile(file as File, 'jenis-quality-training')
      if (res.url) urls.push(res.url)
    }
    setFormData(prev => ({ ...prev, logos: [prev.logos, urls.join(', ')].filter(Boolean).join(', ') }))
  }

  const handleDetailLogosUpload = async (idx: number, files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArr = Array.from(files)
    const urls: string[] = []
    for (const file of fileArr) {
      const res = await uploadQTFile(file as File, `detail-quality-training`)
      if (res.url) urls.push(res.url)
    }
    updateDetail(idx, { logos: [details[idx].logos, urls.join(', ')].filter(Boolean).join(', ') })
  }

  const handleSubdetailLogosUpload = async (detailIdx: number, subIdx: number, files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArr = Array.from(files)
    const urls: string[] = []
    for (const file of fileArr) {
      const res = await uploadQTFile(file as File, `subdetail-quality-training`)
      if (res.url) urls.push(res.url)
    }
    updateSubdetail(detailIdx, subIdx, { logos: [details[detailIdx].subdetails[subIdx].logos, urls.join(', ')].filter(Boolean).join(', ') })
  }
  const [details, setDetails] = useState<DetailState[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    if ((session.user as any)?.role !== 'SUPER_ADMIN' && (session.user as any)?.role !== 'ADMIN') {
      router.push('/login'); return
    }
    fetchQTs()
  }, [session, status, router])

  const fetchQTs = async () => {
    try {
      const res = await fetch('/api/quality-training')
      if (res.ok) {
        const data = await res.json()
        setQts(data.map((d: any) => ({ id: d.id, title: d.title })))
      }
    } catch (e) { console.error(e) }
  }

  const addDetail = () => setDetails(prev => [...prev, { name: '', description: '', linkslide: '', logos: '', subdetails: [] }])
  const removeDetail = (idx: number) => setDetails(prev => prev.filter((_, i) => i !== idx))
  const updateDetail = (idx: number, patch: Partial<DetailState>) => setDetails(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d))

  const addSubdetail = (detailIdx: number) => setDetails(prev => prev.map((d, i) => i === detailIdx ? { ...d, subdetails: [...d.subdetails, { name: '', description: '', logos: '' }] } : d))
  const removeSubdetail = (detailIdx: number, subIdx: number) => setDetails(prev => prev.map((d, i) => i === detailIdx ? { ...d, subdetails: d.subdetails.filter((_, j) => j !== subIdx) } : d))
  const updateSubdetail = (detailIdx: number, subIdx: number, patch: Partial<SubdetailState>) => setDetails(prev => prev.map((d, i) => i === detailIdx ? { ...d, subdetails: d.subdetails.map((s, j) => j === subIdx ? { ...s, ...patch } : s) } : d))

  const openDetailFilePicker = (idx: number) => {
    const el = document.getElementById(`detail-logos-${idx}`) as HTMLInputElement | null
    el?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        logos: formData.logos.split(',').map(s => s.trim()).filter(Boolean),
        qualityTrainingId: formData.qualityTrainingId,
        details: details.map(d => ({
          name: d.name,
          description: d.description,
          linkslide: d.linkslide,
          logos: d.logos.split(',').map(s => s.trim()).filter(Boolean),
          subdetails: d.subdetails.map(s => ({
            name: s.name,
            description: s.description,
            logos: s.logos.split(',').map(v => v.trim()).filter(Boolean)
          }))
        }))
      }
      const response = await fetch('/api/jenis-quality-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        alert(qtContent.messages.itemSaved)
        router.push('/admin/quality-training?tab=jenis')
      } else {
        const err = await response.json(); alert(err.error || 'Error creating Jenis')
      }
    } catch (error) {
      console.error('Error creating Jenis Quality & Training:', error)
      alert('Error creating Jenis')
    } finally { setLoading(false) }
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
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold mb-2">Tambah Jenis Quality & Training</h1>
              <p className="text-blue-100 text-lg">Tambah jenis beserta detail dan subdetail</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Jenis</Label>
                <Input id="name" type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Masukkan nama jenis" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualityTrainingId">Quality & Training</Label>
                <select
                  id="qualityTrainingId"
                  value={formData.qualityTrainingId}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualityTrainingId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                  required
                >
                  <option value="">Pilih Quality & Training</option>
                  {qts.map(q => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
              </div>
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
                <input id="logos" type="file" accept="image/*" multiple onChange={(e) => handleJenisLogosUpload(e.target.files)} className="hidden" />
                <label htmlFor="logos" className="flex flex-col items-center justify-center w-full px-6 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200 group">
                  <div className="p-2.5 bg-gray-100 rounded-full group-hover:bg-[#03438f]/10 transition-colors">
                    <Upload className="h-5 w-5 text-gray-400 group-hover:text-[#03438f] transition-colors" />
                  </div>
                  <div className="text-center mt-1.5">
                    <p className="text-sm font-medium text-gray-900">{jenisLogoFiles.length ? `${jenisLogoFiles.length} file dipilih` : 'Klik untuk upload gambar'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">PNG, JPG hingga 10MB</p>
                  </div>
                </label>
              </div>
              {jenisLogoFiles.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-3">
                  {jenisLogoFiles.map((f, idx) => (
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
                          onClick={() => setJenisLogoFiles(prev => prev.filter((_, i) => i !== idx))}
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
                    <button type="button" className="text-red-500 hover:text-red-700" onClick={() => setJenisLogoFiles([])}>Hapus semua</button>
                  </div>
                </div>
              )}
              {/* Existing Jenis URL previews */}
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
                          onClick={() => removeJenisUrlAt(idx)}
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

            <div className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Detail</h3>
                <Button type="button" onClick={addDetail} className="bg-[#03438f] hover:bg-[#012f65] text-white">
                  <Plus className="h-4 w-4 mr-2" /> Tambah Detail
                </Button>
              </div>

              <div className="space-y-6">
                {details.length === 0 && (
                  <p className="text-sm text-gray-500">Belum ada detail. Gunakan tombol Tambah Detail.</p>
                )}
                {details.map((d, idx) => (
                  <div key={idx} className="border rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Detail #{idx + 1}</h4>
                      <button type="button" onClick={() => removeDetail(idx)} className="text-red-600 hover:text-red-800 flex items-center text-sm">
                        <Trash2 className="h-4 w-4 mr-1" /> Hapus Detail
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nama Detail</Label>
                        <Input value={d.name} onChange={(e) => updateDetail(idx, { name: e.target.value })} placeholder="Nama detail" />
                      </div>
                      <div className="space-y-2">
                        <Label>Deskripsi</Label>
                        <textarea
                          value={d.description}
                          onChange={(e) => updateDetail(idx, { description: e.target.value })}
                          placeholder="Deskripsi detail"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Link Slide</Label>
                        <Input value={d.linkslide || ''} onChange={(e) => updateDetail(idx, { linkslide: e.target.value })} placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Gambar</Label>
                        <div className="relative">
                          <input id={`detail-logos-${idx}`} type="file" accept="image/*" multiple onChange={(e) => handleDetailLogosUpload(idx, e.target.files)} className="hidden" />
                          <label htmlFor={`detail-logos-${idx}`} className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200">
                            <Upload className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Upload gambar detail</span>
                          </label>
                        </div>
                        <button type="button" className="text-xs text-[#03438f] hover:underline" onClick={() => openDetailFilePicker(idx)}>Pilih gambar</button>
                        {d.logos && (<p className="text-xs text-gray-500 break-all">{d.logos}</p>)}
                        {/* Existing Detail URL previews */}
                        {parseUrls(d.logos as any).length > 0 && (
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                            {parseUrls(d.logos as any).map((url, i2) => (
                              <div
                                key={i2}
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
                                    onClick={() => removeDetailUrlAt(idx, i2)}
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
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Subdetail</h5>
                        <Button type="button" onClick={() => addSubdetail(idx)} variant="outline">
                          <Plus className="h-4 w-4 mr-2" /> Tambah Subdetail
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {d.subdetails.length === 0 && (
                          <p className="text-sm text-gray-500">Belum ada subdetail.</p>
                        )}
                        {d.subdetails.map((s, j) => (
                          <div key={j} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Subdetail #{j + 1}</span>
                              <button type="button" onClick={() => removeSubdetail(idx, j)} className="text-red-600 hover:text-red-800 text-xs flex items-center">
                                <Trash2 className="h-3 w-3 mr-1" /> Hapus
                              </button>
                            </div>
                            <div className="space-y-3">
                              <Input value={s.name} onChange={(e) => updateSubdetail(idx, j, { name: e.target.value })} placeholder="Nama subdetail" />
                              <textarea
                                value={s.description}
                                onChange={(e) => updateSubdetail(idx, j, { description: e.target.value })}
                                placeholder="Deskripsi subdetail"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                                rows={4}
                              />
                              <div className="relative">
                                <input id={`subdetail-logos-${idx}-${j}`} type="file" accept="image/*" multiple onChange={(e) => handleSubdetailLogosUpload(idx, j, e.target.files)} className="hidden" />
                                <label htmlFor={`subdetail-logos-${idx}-${j}`} className="flex items-center justify-center w-full px-3 py-4 border border-dashed border-gray-300 rounded cursor-pointer hover:border-[#03438f] hover:bg-[#03438f]/5 transition-all duration-200">
                                  <Upload className="h-3 w-3 text-gray-400 mr-2" />
                                  <span className="text-xs text-gray-600">Upload gambar subdetail</span>
                                </label>
                              </div>
                              {s.logos && (<p className="text-xs text-gray-500 break-all">{s.logos}</p>)}
                              {/* Existing Subdetail URL previews */}
                              {parseUrls(s.logos as any).length > 0 && (
                                <div className="mt-1 grid grid-cols-2 gap-2">
                                  {parseUrls(s.logos as any).map((url, i3) => (
                                    <div
                                      key={i3}
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
                                          onClick={() => removeSubdetailUrlAt(idx, j, i3)}
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
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
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


