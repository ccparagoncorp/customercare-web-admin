"use client"

import { useSession } from "next-auth/react"
import { Search, Bell, Settings, User } from "lucide-react"
import navigationContent from "@/content/navigation.json"

export function Header() {
  const { data: session } = useSession()
  const { header } = navigationContent

  return (
    <header className="absolute top-0 left-0 right-0 z-30 bg-white shadow-sm border-b border-gray-200 h-12 flex items-center justify-between px-4">
      <div></div>
      {/* Left side - Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            type="text"
            placeholder={header.searchPlaceholder}
            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#03438f] focus:border-transparent"
          />
        </div>
      </div>

      {/* Right side - User actions */}
      <div className="flex items-center space-x-2">
        {/* Notifications */}
        <button className="relative p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 bg-red-500 rounded-full"></span>
        </button>

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
                {(session?.user as any)?.role || "SUPER_ADMIN"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
