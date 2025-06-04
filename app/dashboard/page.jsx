import ProtectedRoute from "@/components/ProtectedRoute"
import Navigation from "@/components/Navigation"
import DeviceCard from "@/components/DeviceCard"
import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"

async function getDashboardData() {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    // Get user's shops
    const { data: shops, error: shopsError } = await supabase.from("shops").select("*").eq("owner", user.id)

    if (shopsError) {
      console.error("Error fetching shops:", shopsError)
    }

    // Get user's devices
    let devices = []
    try {
      const { data: devicesData, error: devicesError } = await supabase
        .from("devices")
        .select(`
          *,
          relay_channels (*)
        `)
        .eq("owner", user.id)
        .eq("is_active", true)

      if (devicesError) {
        console.error("Error fetching devices with relations:", devicesError)

        // Try without relations
        const { data: simpleDevices, error: simpleError } = await supabase
          .from("devices")
          .select("*")
          .eq("owner", user.id)
          .eq("is_active", true)

        if (simpleError) {
          console.error("Error fetching devices:", simpleError)
        } else {
          devices = simpleDevices?.map((device) => ({ ...device, relay_channels: [] })) || []
        }
      } else {
        devices = devicesData || []
      }
    } catch (error) {
      console.error("Database error:", error)
      devices = []
    }

    return { shops: shops || [], devices, user }
  } catch (error) {
    console.error("Error in getDashboardData:", error)
    return null
  }
}

import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                VendorFlow
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Manage your IoT devices, vending machines, relay controllers, and water pumps all in one place with
                real-time MQTT integration.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-blue-600">Shop Management</CardTitle>
                  <CardDescription>
                    Organize and manage multiple shop locations with their vending machines
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Multiple shop locations</li>
                    <li>• Vending machine tracking</li>
                    <li>• Liquid level monitoring</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-purple-600">Smart Home Control</CardTitle>
                  <CardDescription>Control relay devices and IoT equipment remotely via MQTT</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Relay channel control</li>
                    <li>• Custom switch types</li>
                    <li>• Real-time status updates</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-green-600">Water Pump Systems</CardTitle>
                  <CardDescription>Monitor and control water pump operations with balance tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Pump start/stop control</li>
                    <li>• Water balance monitoring</li>
                    <li>• Remote control of water pumps</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-16 text-center">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg max-w-2xl mx-auto">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-4">Database Setup Required</h3>
                  <p className="text-gray-600 mb-4">
                    It looks like your database tables haven't been created yet. Please run the database setup script in
                    your Supabase SQL editor.
                  </p>
                  <Button asChild>
                    <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                      Open Supabase Dashboard
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </>
    )
  }

  const { shops, devices } = data

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Manage your IoT devices and shops</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Shops</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{shops?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{devices?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Online Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {devices?.filter((d) => d.status === "online").length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {devices && devices.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Devices</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.slice(0, 6).map((device) => (
                  <DeviceCard key={device.id} device={device} />
                ))}
              </div>
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-semibold mb-2">No Active Devices</h3>
                <p className="text-gray-600 mb-4">Start by acquiring devices from the marketplace</p>
                <Button asChild>
                  <Link href="/marketplace">Browse Marketplace</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
