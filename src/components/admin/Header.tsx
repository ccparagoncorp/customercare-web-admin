"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Search, Settings, User, X } from "lucide-react"
import navigationContent from "@/content/navigation.json"
import { NotificationBell } from "./NotificationBell"
import { SearchDropdown } from "./SearchDropdown"

interface UserWithRole {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
}

export function Header() {
  const { data: session } = useSession()
  const { header } = navigationContent
  const [sidebarWidth, setSidebarWidth] = useState(64) // Default width when sidebar is collapsed
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

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
    <header 
      className="fixed top-0 right-0 z-40 bg-white shadow-sm border-b border-gray-200 h-12 flex items-center justify-between px-4 transition-all duration-300"
      style={{ left: `${sidebarWidth}px` }}
    >
      <div></div>
      {/* Left side - Search */}
      <div className="flex-1 max-w-sm" ref={searchContainerRef}>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            type="text"
            placeholder={header.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) {
                setIsSearchOpen(true)
              }
            }}
            className="w-full pl-7 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#03438f] focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setIsSearchOpen(false)
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <SearchDropdown
            isOpen={isSearchOpen && searchQuery.trim().length >= 2}
            onClose={() => setIsSearchOpen(false)}
            query={searchQuery}
          />
        </div>
      </div>

      {/* Right side - User actions */}
      <div className="flex items-center space-x-2">
        {/* Notifications */}
        <NotificationBell />

        {/* Settings */}
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          <Settings className="h-4 w-4" />
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[#03438f] rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-gray-900">
                {session?.user?.name || "Admin"}
              </p>
              <p className="text-xs text-gray-500">
                {(session?.user as UserWithRole)?.role || "SUPER_ADMIN"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
