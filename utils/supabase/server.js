import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // First try to use environment variables
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If environment variables are available, use them
  if (envUrl && envKey) {
    return createBrowserClient(envUrl, envKey);
  }
}
