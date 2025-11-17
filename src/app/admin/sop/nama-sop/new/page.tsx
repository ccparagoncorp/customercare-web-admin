'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import sopContent from "@/content/sop.json"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

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

export default function NewNamaSOP() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [kategoriSOPs, setKategoriSOPs] = useState<KategoriSOP[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    link: '',
    kategoriSOPId: ''
  })

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

    fetchKategoriSOPs()
  }, [session, status, router])

  const fetchKategoriSOPs = async () => {
    try {
      const response = await fetch('/api/kategori-sop')
      if (response.ok) {
        const data = await response.json()
        setKategoriSOPs(data)
      }
    } catch (error) {
      console.error('Error fetching kategori SOPs:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/sop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert(sopContent.messages.itemSaved)
        router.push('/admin/sop?tab=namaSOP')
      } else {
        const error = await response.json()
        alert(error.error || 'Error creating nama SOP')
      }
    } catch (error) {
      console.error('Error creating nama SOP:', error)
      alert('Error creating nama SOP')
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

  if (!session) {
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
              <h1 className="text-3xl font-bold mb-2">Tambah Nama SOP</h1>
              <p className="text-blue-100 text-lg">Tambah nama SOP baru ke sistem</p>
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
              <Label htmlFor="link">Link SOP</Label>
              <Input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://contoh-link-sop.com"
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
                {loading ? 'Menyimpan...' : sopContent.actions.save}
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

