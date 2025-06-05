"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"

export interface DeviceUsage {
  device_id: string
  device_name: string
  device_type: string
  total_actions: number
  last_used: string
  daily_usage: { date: string; count: number }[]
  weekly_usage: { week: string; count: number }[]
}

export interface AnalyticsData {
  totalDevices: number
  activeDevices: number
  totalActions: number
  deviceUsage: DeviceUsage[]
  topDevices: DeviceUsage[]
  usageByType: { type: string; count: number }[]
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAnalytics = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get user's devices
      const { data: devices } = await supabase.from("devices").select("*").eq("owner", user.id).eq("is_active", true)

      // Get MQTT messages for usage analytics
      const { data: messages } = await supabase
        .from("mqtt_messages")
        .select("*")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order("created_at", { ascending: false })

      if (!devices || !messages) {
        setAnalytics({
          totalDevices: 0,
          activeDevices: 0,
          totalActions: 0,
          deviceUsage: [],
          topDevices: [],
          usageByType: [],
        })
        return
      }

      // Process analytics data
      const deviceUsageMap = new Map<string, DeviceUsage>()
      const usageByTypeMap = new Map<string, number>()

      devices.forEach((device) => {
        deviceUsageMap.set(device.device_id, {
          device_id: device.device_id,
          device_name: device.name,
          device_type: device.device_type,
          total_actions: 0,
          last_used: device.last_seen || device.created_at,
          daily_usage: [],
          weekly_usage: [],
        })

        const currentCount = usageByTypeMap.get(device.device_type) || 0
        usageByTypeMap.set(device.device_type, currentCount + 1)
      })

      // Process messages for usage statistics
      messages.forEach((message) => {
        if (message.device_id && deviceUsageMap.has(message.device_id)) {
          const usage = deviceUsageMap.get(message.device_id)!
          usage.total_actions++
          if (new Date(message.created_at) > new Date(usage.last_used)) {
            usage.last_used = message.created_at
          }
        }
      })

      // Generate daily usage data for the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split("T")[0]
      }).reverse()

      deviceUsageMap.forEach((usage) => {
        usage.daily_usage = last7Days.map((date) => ({
          date,
          count: messages.filter((m) => m.device_id === usage.device_id && m.created_at.startsWith(date)).length,
        }))
      })

      const deviceUsage = Array.from(deviceUsageMap.values())
      const topDevices = deviceUsage.sort((a, b) => b.total_actions - a.total_actions).slice(0, 5)

      const usageByType = Array.from(usageByTypeMap.entries()).map(([type, count]) => ({
        type: type.replace("_", " "),
        count,
      }))

      setAnalytics({
        totalDevices: devices.length,
        activeDevices: devices.filter((d) => d.status === "online").length,
        totalActions: messages.length,
        deviceUsage,
        topDevices,
        usageByType,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  return { analytics, loading, refetch: fetchAnalytics }
}
