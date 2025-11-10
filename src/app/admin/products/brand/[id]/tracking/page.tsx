'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { AdminLayout } from "@/components/admin/AdminLayout"
import { TracerUpdateDisplay } from "@/components/admin/TracerUpdateDisplay"
import { ArrowLeft, Package } from "lucide-react"
import Image from 'next/image'

interface UserWithRole {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

interface Brand {
  id: string
  name: string
  description?: string
  images: string[]
  colorbase?: string
}

function BrandTrackingContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const brandId = params?.id as string

  const [brand, setBrand] = useState<Brand | null>(null)
  const [brandLoading, setBrandLoading] = useState(true)

  // Fetch brand info
  useEffect(() => {
    if (!brandId) return

    const fetchBrand = async () => {
      setBrandLoading(true)
      try {
        const response = await fetch(`/api/brand/${brandId}`)
        if (response.ok) {
          const brandData = await response.json()
          setBrand(brandData)
        } else {
          console.error('Failed to fetch brand')
          router.push('/admin/products')
        }
      } catch (error) {
        console.error('Error fetching brand:', error)
        router.push('/admin/products')
      } finally {
        setBrandLoading(false)
      }
    }

    fetchBrand()
  }, [brandId, router])

  useEffect(() => {
    if (status === 'loading' || brandLoading) return

    if (!session) {
      router.push('/login')
      return
    }

    const user = session.user as UserWithRole
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
      router.push('/login')
      return
    }
  }, [session, status, router, brandLoading])

  if (brandLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!brand) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Brand tidak ditemukan</p>
            <button
              onClick={() => router.push('/admin/products')}
              className="mt-4 px-4 py-2 bg-[#03438f] text-white rounded-lg hover:bg-[#012f65] transition-colors"
            >
              Kembali ke Products
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03438f] to-[#012f65] rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/products')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-4">
                {brand.images && brand.images.length > 0 && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/20 flex items-center justify-center">
                    <Image
                      src={brand.images[0]}
                      alt={brand.name}
                      width={64}
                      height={64}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold mb-2">Tracer Updates - {brand.name}</h1>
                  <p className="text-blue-100 text-lg">View all updates for this brand</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tracer Update Display */}
        <TracerUpdateDisplay 
          brandId={brandId}
          title={`Tracer Updates for ${brand.name}`}
        />
      </div>
    </AdminLayout>
  )
}

export default function BrandTracking() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    }>
      <BrandTrackingContent />
    </Suspense>
  )
}
