"use client"

import { useState, useEffect } from "react"

interface OfflineAction {
  id: string
  type: "toggle" | "dispense"
  deviceId: string
  deviceName: string
  data: any
  timestamp: string
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true)
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([])

  useEffect(() => {
    // Load offline actions from localStorage
    const stored = localStorage.getItem("vendorflow-offline-actions")
    if (stored) {
      setOfflineActions(JSON.parse(stored))
    }

    // Set initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const addOfflineAction = (action: Omit<OfflineAction, "id" | "timestamp">) => {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }

    const updatedActions = [...offlineActions, newAction]
    setOfflineActions(updatedActions)
    localStorage.setItem("vendorflow-offline-actions", JSON.stringify(updatedActions))

    // Show SMS instructions for offline actions
    if (typeof window !== "undefined") {
      const smsInstructions = getSMSInstructions(action)
      if (smsInstructions) {
        // You could show a toast or modal with SMS instructions here
        console.log("SMS Instructions:", smsInstructions)
      }
    }
  }

  const getSMSInstructions = (action: Omit<OfflineAction, "id" | "timestamp">) => {
    switch (action.type) {
      case "dispense":
        return `Send SMS to ${action.data.phoneNumber}: DISPENSE ${action.data.amount}`
      case "toggle":
        const state = action.data.newState ? "ON" : "OFF"
        return `Send SMS to ${action.data.phoneNumber}: ${state} ${action.data.channelNumber || ""}`
      default:
        return null
    }
  }

  const clearOfflineActions = () => {
    setOfflineActions([])
    localStorage.removeItem("vendorflow-offline-actions")
  }

  const executeOfflineActions = async () => {
    if (!isOnline || offlineActions.length === 0) return

    // Here you would implement the logic to send SMS/API calls to devices
    // For now, we'll just simulate the execution
    console.log("Executing offline actions:", offlineActions)

    // Clear actions after execution
    clearOfflineActions()
  }

  useEffect(() => {
    if (isOnline && offlineActions.length > 0) {
      executeOfflineActions()
    }
  }, [isOnline])

  return {
    isOnline,
    offlineActions,
    addOfflineAction,
    clearOfflineActions,
  }
}
