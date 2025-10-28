"use client"

import { ReactNode, useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(64) // Default width when sidebar is collapsed

  useEffect(() => {
    const handleMouseEnter = () => setSidebarWidth(256) // 64 * 4 = 256px (w-64)
    const handleMouseLeave = () => setSidebarWidth(64) // 16 * 4 = 64px (w-16)

    // Add event listeners to sidebar
    const sidebar = document.querySelector('[data-sidebar]')
    if (sidebar) {
      sidebar.addEventListener('mouseenter', handleMouseEnter)
      sidebar.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      if (sidebar) {
        sidebar.removeEventListener('mouseenter', handleMouseEnter)
        sidebar.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [])

  return (
    <>
      <Sidebar />
      <Header />
      
      {/* Main Content */}
      <div 
        className="pt-12 min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <main className="p-6">
          <div className="mx-auto">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
