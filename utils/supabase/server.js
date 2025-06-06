import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Hardcoded credentials for immediate testing
const SUPABASE_URL = "https://lykapqzcplsvsxwiblde.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2FwcXpjcGxzdnN4d2libGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjcxNTksImV4cCI6MjA2NDM0MzE1OX0.JsFVbtgduomzbOYtW1suXwiaJb37BCNy3HphN5IVRi4"

export function createClient() {
  const cookieStore = cookies()

  // First try to use environment variables
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Use environment variables if available, otherwise use hardcoded values
  const supabaseUrl = envUrl || SUPABASE_URL
  const supabaseKey = envKey || SUPABASE_ANON_KEY

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
