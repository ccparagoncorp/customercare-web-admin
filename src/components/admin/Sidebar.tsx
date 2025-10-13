"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LayoutDashboard, Users } from "lucide-react"
import sidebarContent from "@/content/sidebar.json"

export function Sidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const pathname = usePathname()
  const { admin } = sidebarContent

  const menuItems = [
    {
      name: admin.dashboard.label,
      href: "/admin/dashboard",
      icon: "lucide",
      iconComponent: LayoutDashboard,
      active: pathname === "/admin/dashboard"
    },
    {
      name: admin.manageAgents.label,
      href: "/admin/agents",
      icon: "lucide",
      iconComponent: Users,
      active: pathname === "/admin/agents"
    },
    {
      name: admin.manageKnowledge.label,
      href: "/admin/knowledge",
      icon: admin.manageKnowledge.icon,
      active: pathname === "/admin/knowledge"
    },
    {
      name: admin.manageProducts.label,
      href: "/admin/products",
      icon: admin.manageProducts.icon,
      active: pathname === "/admin/products"
    },
    {
      name: admin.manageSOP.label,
      href: "/admin/sop",
      icon: admin.manageSOP.icon,
      active: pathname === "/admin/sop"
    }
  ]

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <div 
      className={`bg-gradient-to-b from-white to-gray-50 shadow-xl border-r border-gray-200 transition-all duration-300 ${isHovered ? 'w-64' : 'w-16'} h-screen flex flex-col`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-center">
          {isHovered ? (
            <Image
              src="/logo.png"
              alt="Logo"
              width={108}
              height={108}
              className="rounded-lg"
            />
          ) : (
            <Image
              src="/logomini.png"
              alt="Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-2 p-2">
        {menuItems.map((item) => {
          const IconComponent = item.iconComponent
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-xl transition-all duration-200 group relative px-4 py-3 ${
                item.active
                  ? 'bg-gradient-to-r from-[#03438f] to-[#012f65] text-white shadow-lg shadow-[#03438f]/20'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-[#03438f] hover:shadow-md'
              }`}
            >
              {item.active && isHovered && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
              )}
              <div className="mr-3 flex-shrink-0">
                {item.icon === "lucide" && IconComponent ? (
                  <IconComponent className={`h-4 w-4 ${item.active ? 'text-white' : 'text-[#03438f] group-hover:text-[#03438f]'}`} />
                ) : (
                  <Image
                    src={item.active ? (item.icon as any).active : (item.icon as any).inactive}
                    alt={item.name}
                    width={16}
                    height={16}
                    className="transition-opacity duration-200"
                  />
                )}
              </div>
              {isHovered && (
                <>
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.active && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                    </div>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-gray-200 bg-white p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 group px-4 py-3"
        >
          <div className="mr-3 flex-shrink-0">
            <Image
              src={admin.logout.icon}
              alt={admin.logout.label}
              width={16}
              height={16}
              className="transition-opacity duration-200"
            />
          </div>
          {isHovered && (
            <span className="text-sm font-medium">{admin.logout.label}</span>
          )}
        </button>
      </div>
    </div>
  )
}
