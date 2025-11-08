"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Lock, User, Key, ArrowRight, Eye, EyeOff } from "lucide-react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import authContent from "@/content/auth.json"

const { login } = authContent

const loginSchema = z.object({
  email: z.string().email(login.messages.usernameRequired),
  password: z.string().min(6, login.messages.passwordMinLength),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const callbackUrlParam = searchParams.get('callbackUrl')
      let callbackUrl = '/admin/dashboard'
      
      if (callbackUrlParam) {
        try {
          // Decode URL jika perlu
          const decodedUrl = decodeURIComponent(callbackUrlParam)
          // Extract path dari full URL jika ada
          try {
            const urlObj = new URL(decodedUrl)
            callbackUrl = urlObj.pathname || '/admin/dashboard'
          } catch {
            // Jika bukan full URL, gunakan sebagai path langsung
            callbackUrl = decodedUrl.startsWith('/') ? decodedUrl : '/admin/dashboard'
          }
        } catch {
          // Jika decode gagal, gunakan langsung
          callbackUrl = callbackUrlParam.startsWith('/') ? callbackUrlParam : '/admin/dashboard'
        }
      }
      
      // Sign in - check for errors first
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      })

      if (result?.error) {
        console.error('Login error:', result.error)
        setError(login.messages.loginError)
        setIsLoading(false)
        return
      }

      if (!result?.ok) {
        setError(login.messages.loginError)
        setIsLoading(false)
        return
      }

      // Login successful
      // The session cookie should be set by NextAuth at this point
      // Use window.location for full page reload to ensure middleware can read the cookie
      // This is more reliable than router.push for authentication flows
      window.location.href = callbackUrl
    } catch (err) {
      console.error('Login error:', err)
      setError(login.messages.generalError)
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 w-full max-w-sm mx-auto">
      {/* Top Icon */}
      <div className="flex justify-center mb-4">
        <div className="bg-[#03438f] p-3 rounded-xl shadow-lg">
          <Lock className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{login.form.title}</h2>
        <p className="text-gray-600 text-sm">{login.form.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Email Input */}
        <div className="space-y-1">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            {login.form.usernameLabel}
          </Label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 z-100 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-[#03438f]" />
            </div>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder={login.form.usernamePlaceholder}
              disabled={isLoading}
              className="pl-10 h-11 rounded-lg border-gray-300 focus:border-[#03438f] focus:ring-[#03438f] bg-white/80 backdrop-blur-sm"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password Input */}
        <div className="space-y-1">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            {login.form.passwordLabel}
          </Label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 z-100 flex items-center pointer-events-none">
              <Key className="h-4 w-4 text-[#03438f]" />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              placeholder={login.form.passwordPlaceholder}
              disabled={isLoading}
              className="pl-10 pr-10 h-11 rounded-lg border-gray-300 focus:border-[#03438f] focus:ring-[#03438f] bg-white/80 backdrop-blur-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-[#03438f] focus:ring-[#03438f] border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">{login.form.rememberMe}</span>
          </label>
          <button
            type="button"
            className="text-sm text-[#03438f] hover:text-[#03438f]/80 font-medium"
          >
            {login.form.forgotPassword}
          </button>
        </div>

        {/* Sign In Button */}
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-11 bg-[#03438f] hover:bg-[#03438f]/90 text-white font-semibold rounded-lg flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{login.form.signingInButton}</span>
            </>
          ) : (
            <>
              <span>{login.form.signInButton}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

    </div>
  )
}
