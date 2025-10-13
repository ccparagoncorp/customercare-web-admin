import { ReactNode } from "react"
import LoginBackground from "./LoginBackground"
import { LoginHeader } from "./LoginHeader"

interface LoginLayoutProps {
  children: ReactNode
}

export function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <LoginBackground />

      <LoginHeader />
      <div className="relative z-20 mt-16 flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
        {children}
      </div>
    </div>
  )
}
