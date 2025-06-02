"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Store, Zap, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/shops", label: "My Shops", icon: Store },
    { href: "/smart-home", label: "Smart Home", icon: Zap },
    { href: "/marketplace", label: "Marketplace", icon: Settings },
  ]

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.user_metadata?.role === "admin") {
        setIsAdmin(true)
      }
    }
    checkAdminStatus()
  }, [])

  // Update navItems to include admin conditionally
  const allNavItems = [...navItems, ...(isAdmin ? [{ href: "/admin", label: "Admin Panel", icon: Settings }] : [])]

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              IoT Manager
            </Link>
            <div className="hidden md:flex space-x-4">
              {allNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
