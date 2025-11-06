import { LoginLayout } from "@/components/auth/LoginLayout"
import { LoginForm } from "@/components/auth/LoginForm"
import { Suspense } from "react"

function LoginFormWrapper() {
  return <LoginForm />
}

export default function LoginPage() {
  return (
    <LoginLayout>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
        </div>
      }>
        <LoginFormWrapper />
      </Suspense>
    </LoginLayout>
  )
}
