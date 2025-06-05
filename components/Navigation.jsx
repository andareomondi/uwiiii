"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Store, Zap, Settings, LogOut, Menu, X, Shield, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useUserRole } from "@/hooks/use-user-role"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/ThemeToggle"
import { OfflineIndicator } from "@/components/OfflineIndicator"

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { role, isAdmin, isStaff } = useUserRole()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of VendorFlow.",
        variant: "default",
      })
      router.push("/login")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/shops", label: "My Shops", icon: Store },
    { href: "/smart-home", label: "Smart Home", icon: Zap },
    { href: "/marketplace", label: "Marketplace", icon: Settings },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ]

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Add admin panel for admin users only
  const allNavItems = [...navItems, ...(isAdmin ? [{ href: "/admin", label: "Admin Panel", icon: Shield }] : [])]

  const getRoleBadgeColor = () => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "staff":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600 dark:text-blue-400">
              VendorFlow
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
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Offline Indicator */}
            <OfflineIndicator />

            {/* Role Badge */}
            <div className={`hidden md:flex px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            <Button variant="outline" size="sm" onClick={handleLogout} className="hidden md:flex items-center gap-2">
              <LogOut size={16} />
              Logout
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white dark:bg-gray-900 dark:border-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Role Badge Mobile */}
              <div
                className={`flex justify-center mb-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)} User
              </div>

              {allNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 mt-2"
              >
                <LogOut size={16} />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
