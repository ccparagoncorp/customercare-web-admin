'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import sopContent from "@/content/sop.json"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

interface KategoriSOP {
  id: string
  name: string
}

export default function EditNamaSOP({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sop, setSOP] = useState<any>(null)
  const [kategoriSOPs, setKategoriSOPs] = useState<KategoriSOP[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    kategoriSOPId: ''
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

    fetchData()
  }, [session, status, router, resolvedParams.id])

  const fetchData = async () => {
    try {
      const [sopRes, kategoriSOPsRes] = await Promise.all([
        fetch(`/api/sop/${resolvedParams.id}`),
        fetch('/api/kategori-sop')
      ])

      if (sopRes.ok) {
        const data = await sopRes.json()
        setSOP(data)
        setFormData({
          name: data.name,
          description: data.description || '',
          kategoriSOPId: data.kategoriSOPId
        })
      }

      if (kategoriSOPsRes.ok) {
        const data = await kategoriSOPsRes.json()
        setKategoriSOPs(data)
      }

      if (!sopRes.ok) {
        router.push('/admin/sop')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      router.push('/admin/sop')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/sop/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert(sopContent.messages.itemUpdated)
        router.push('/admin/sop?tab=namaSOP')
      } else {
        const error = await response.json()
        alert(error.error || 'Error updating nama SOP')
      }
    } catch (error) {
      console.error('Error updating nama SOP:', error)
      alert('Error updating nama SOP')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || !sop) {
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
              <h1 className="text-3xl font-bold mb-2">Edit Nama SOP</h1>
              <p className="text-blue-100 text-lg">Edit nama SOP: {sop.name}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nama SOP</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Masukkan nama SOP"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Masukkan deskripsi SOP"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03438f] focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kategoriSOPId">Kategori SOP</Label>
              <select
                id="kategoriSOPId"
                value={formData.kategoriSOPId}
                onChange={(e) => setFormData(prev => ({ ...prev, kategoriSOPId: e.target.value }))}
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

