"use client"

import { useState, useEffect } from "react"

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported("Notification" in window)
    if ("Notification" in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === "granted"
    } catch (error) {
      console.error("Error requesting notification permission:", error)
      return false
    }
  }

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== "granted") return

    const notification = new Notification(title, {
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      ...options,
    })

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)

    return notification
  }

  const sendDeviceNotification = (deviceName: string, action: string, success: boolean) => {
    const title = success ? "Device Action Successful" : "Device Action Failed"
    const body = `${deviceName}: ${action}`
    const icon = success ? "✅" : "❌"

    sendNotification(title, {
      body: `${icon} ${body}`,
      tag: `device-${deviceName}`,
    })
  }

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    sendDeviceNotification,
  }
}
