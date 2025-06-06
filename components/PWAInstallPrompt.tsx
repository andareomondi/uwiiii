"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X, Smartphone } from "lucide-react"
import { usePWA } from "@/hooks/use-pwa"

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA()
  const [dismissed, setDismissed] = useState(false)

  if (!isInstallable || isInstalled || dismissed) {
    return null
  }

  const handleInstall = async () => {
    const success = await installApp()
    if (!success) {
      setDismissed(true)
    }
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-xl border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-sm text-gray-900 dark:text-white">Install VendorFlow</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} className="h-6 w-6 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
          Install our app for a better experience with offline support and notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button onClick={handleInstall} className="w-full" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Install App
        </Button>
      </CardContent>
    </Card>
  )
}
