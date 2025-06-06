"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function EnvWarning() {
  return (
    <div className="max-w-md mx-auto mt-8 p-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          <p className="mb-4">
            Missing required environment variables. Please make sure you have set up the following in your .env.local
            file:
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          </ul>
          <p className="mb-4">You can find these values in your Supabase project settings under API settings.</p>
          <Button onClick={() => window.open("https://supabase.com/dashboard", "_blank")} className="w-full">
            Go to Supabase Dashboard
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
