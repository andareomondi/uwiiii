"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"

export type UserRole = "user" | "staff" | "admin"

export function useUserRole() {
  const [role, setRole] = useState<UserRole>("user")
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user?.user_metadata?.role) {
          setRole(user.user_metadata.role as UserRole)
        } else {
          setRole("user")
        }
      } catch (error) {
        console.error("Error getting user role:", error)
        setRole("user")
      } finally {
        setLoading(false)
      }
    }

    getUserRole()
  }, [supabase])

  const isAdmin = role === "admin"
  const isStaff = role === "staff" || role === "admin"
  const isUser = role === "user" || role === "staff" || role === "admin"

  return {
    role,
    loading,
    isAdmin,
    isStaff,
    isUser,
  }
}
