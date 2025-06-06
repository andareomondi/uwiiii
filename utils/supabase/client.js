import { createBrowserClient } from "@supabase/ssr"

// Hardcoded credentials for immediate testing
const SUPABASE_URL = "https://lykapqzcplsvsxwiblde.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2FwcXpjcGxzdnN4d2libGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjcxNTksImV4cCI6MjA2NDM0MzE1OX0.JsFVbtgduomzbOYtW1suXwiaJb37BCNy3HphN5IVRi4"

export function createClient() {
  // First try to use environment variables
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If environment variables are available, use them
  if (envUrl && envKey) {
    return createBrowserClient(envUrl, envKey)
  }

  // Otherwise, fall back to hardcoded values
  console.log("Using hardcoded Supabase credentials")
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
