"use client"

import { useState, useEffect } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navigation from "@/components/Navigation"
import DeviceCard from "@/components/DeviceCard"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function SmartHomePage() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("devices")
        .select(`
          *,
          relay_channels (*)
        `)
        .eq("owner", user.id)
        .in("device_type", ["relay_device", "water_pump"])
        .eq("is_active", true)

      setDevices(data || [])
    } catch (error) {
      console.error("Error fetching devices:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Home</h1>
              <p className="text-gray-600">Control your home devices</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">❄️</span>
              <span className="text-xl font-semibold">25°C</span>
            </div>
          </div>
          {/* Device Count */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{devices.length} devices</h2>
            <Button size="sm" className="flex items-center gap-2">
              <Plus size={16} />
              Add Device
            </Button>
          </div>

          {/* Devices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} onUpdate={fetchDevices} />
            ))}
          </div>

          {devices.length === 0 && (
            <Card className="text-center py-12 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent>
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-xl font-semibold mb-2">No Smart Home Devices</h3>
                <p className="text-gray-600 mb-4">Add relay devices and water pumps to control your home</p>
                <Button>Browse Marketplace</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
