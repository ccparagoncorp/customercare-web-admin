"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import layoutContent from "@/content/layout.json"
import authContent from "@/content/auth.json"

export function LoginHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { login } = authContent
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* White Navbar Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-3 sm:mt-6">
        <div className={`bg-white backdrop-blur-sm shadow-xl ${isMobileMenuOpen ? 'sm:rounded-full rounded-4xl' : 'rounded-full'}`}>
          <div className="flex items-center justify-between py-3 sm:py-4 px-4 sm:px-6">
          {/* Logo */}
          <div>
            <Image src={layoutContent.brand.logo} alt="Logo" width={120} height={64} className="sm:w-[150px] sm:h-auto"/>
          </div>
          
          {/* Desktop Back to Home Button */}
          <Link href="/" className="hidden md:block bg-[#03438f] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#012f65] cursor-pointer text-sm">
            {login.navigation.backToHome}
          </Link>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle mobile menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white rounded-b-full">
              <div className="px-4 py-4 space-y-3">
                
                {/* Mobile Back to Home Button */}
                <Link 
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full mt-4 bg-[#03438f] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#012f65] cursor-pointer text-sm block text-center"
                >
                  {login.navigation.backToHome}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
