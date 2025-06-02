import ProtectedRoute from "@/components/ProtectedRoute"
import Navigation from "@/components/Navigation"
import DeviceCard from "@/components/DeviceCard"
import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

async function getDashboardData() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's shops
  const { data: shops } = await supabase.from("shops").select("*").eq("owner", user.id)

  // Get user's devices
  const { data: devices } = await supabase
    .from("devices")
    .select(`
      *,
      relay_channels (*)
    `)
    .eq("owner", user.id)
    .eq("is_active", true)

  return { shops, devices, user }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data) {
    return <div>Loading...</div>
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

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Devices</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices?.slice(0, 6).map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
