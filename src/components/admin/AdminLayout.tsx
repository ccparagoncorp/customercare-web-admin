import { ReactNode } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      <Sidebar />
      <div className="mt-12 flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        {/* Sidebar */}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header />
          
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6 bg-transparent">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
