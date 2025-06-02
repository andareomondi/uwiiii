"use client"

import { useState, useEffect } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navigation from "@/components/Navigation"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function MarketplacePage() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const supabase = createClient()
  const [userShops, setUserShops] = useState([])
  const [selectedShop, setSelectedShop] = useState(null)

  useEffect(() => {
    fetchAvailableDevices()
    fetchUserShops()
  }, [])

  const fetchAvailableDevices = async () => {
    try {
      const { data } = await supabase.from("devices").select("*").eq("is_active", false).is("owner", null)

      setDevices(data || [])
    } catch (error) {
      console.error("Error fetching devices:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcquireDevice = async (deviceId, shopId = null) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const updateData = {
        owner: user.id,
        is_active: true,
        acquired_at: new Date().toISOString(),
      }

      if (shopId) {
        updateData.shop_id = shopId
      }

      const { error } = await supabase.from("devices").update(updateData).eq("id", deviceId)

      if (error) throw error

      alert("Device acquired successfully!")
      fetchAvailableDevices()
    } catch (error) {
      console.error("Error acquiring device:", error)
      alert("Failed to acquire device")
    }
  }

  const fetchUserShops = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from("shops").select("*").eq("owner", user.id)

      setUserShops(data || [])
    } catch (error) {
      console.error("Error fetching user shops:", error)
    }
  }

  const filteredDevices = devices.filter((device) => filter === "all" || device.device_type === filter)

  const deviceTypes = [
    { value: "all", label: "All Devices" },
    { value: "vending_machine", label: "Vending Machines" },
    { value: "relay_device", label: "Relay Devices" },
    { value: "water_pump", label: "Water Pumps" },
  ]

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
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Device Marketplace</h1>
            <p className="text-gray-600">Acquire new IoT devices for your setup</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {deviceTypes.map((type) => (
              <Button
                key={type.value}
                variant={filter === type.value ? "default" : "outline"}
                onClick={() => setFilter(type.value)}
                className="whitespace-nowrap"
              >
                {type.label}
              </Button>
            ))}
          </div>

          {/* Devices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device) => (
              <Card key={device.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <Badge variant="secondary">{device.device_type.replace("_", " ")}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">{device.description}</p>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Device ID:</span>
                        <span className="font-mono">{device.device_id}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <Badge variant="outline" className="text-green-600">
                          Available
                        </Badge>
                      </div>
                      {device.device_type === "vending_machine" && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Liquid Type:</span>
                            <span>{device.liquid_type}</span>
                          </div>
                          <div>
                            <Select onValueChange={(value) => setSelectedShop(value)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a shop" />
                              </SelectTrigger>
                              <SelectContent>
                                {userShops.map((shop) => (
                                  <SelectItem key={shop.id} value={shop.id.toString()}>
                                    {shop.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() =>
                        device.device_type === "vending_machine"
                          ? handleAcquireDevice(device.id, selectedShop)
                          : handleAcquireDevice(device.id)
                      }
                    >
                      Acquire Device
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredDevices.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold mb-2">No Devices Available</h3>
                <p className="text-gray-600">Check back later for new devices or contact admin</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
