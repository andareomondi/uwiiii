"use client"

import { useOffline } from "@/hooks/use-offline"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Clock, MessageSquare } from "lucide-react"

export function OfflineIndicator() {
  const { isOnline, offlineActions } = useOffline()

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className="flex items-center gap-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
      >
        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isOnline ? "Online" : "Offline - Use SMS"}
      </Badge>
      {offlineActions.length > 0 && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700"
        >
          <Clock className="w-3 h-3" />
          {offlineActions.length} pending
        </Badge>
      )}
      {!isOnline && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20"
        >
          <MessageSquare className="w-3 h-3" />
          SMS Available
        </Badge>
      )}
    </div>
  )
}
