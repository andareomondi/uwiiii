"use client"

import { useState, useEffect } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navigation from "@/components/Navigation"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Settings, Trash2 } from "lucide-react"

export default function AdminPage() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [newDevice, setNewDevice] = useState({
    device_id: "",
    name: "",
    description: "",
    device_type: "",
    liquid_type: "",
    max_capacity: 5000,
  })
  const supabase = createClient()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchAllDevices()
    }
  }, [isAdmin])

  const checkAdminStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Check if user has admin role in metadata
      const isUserAdmin = user.user_metadata?.role === "admin"
      setIsAdmin(isUserAdmin)

      if (!isUserAdmin) {
        alert("Access denied. Admin privileges required.")
      }
    } catch (error) {
      console.error("Error checking admin status:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllDevices = async () => {
    try {
      const { data } = await supabase
        .from("devices")
        .select(`
          *,
          relay_channels (*)
        `)
        .order("created_at", { ascending: false })

      setDevices(data || [])
    } catch (error) {
      console.error("Error fetching devices:", error)
    }
  }

  const handleCreateDevice = async (e) => {
    e.preventDefault()
    try {
      const deviceData = {
        device_id: newDevice.device_id,
        name: newDevice.name,
        description: newDevice.description,
        device_type: newDevice.device_type,
        is_active: false,
        status: "offline",
      }

      if (newDevice.device_type === "vending_machine") {
        deviceData.liquid_type = newDevice.liquid_type
        deviceData.max_capacity = Number.parseInt(newDevice.max_capacity)
        deviceData.current_level = 0
      }

      const { data, error } = await supabase.from("devices").insert([deviceData]).select()

      if (error) throw error

      setDevices([data[0], ...devices])
      setNewDevice({
        device_id: "",
        name: "",
        description: "",
        device_type: "",
        liquid_type: "",
        max_capacity: 5000,
      })
      setIsCreateDialogOpen(false)
      alert("Device created successfully!")
    } catch (error) {
      console.error("Error creating device:", error)
      alert("Failed to create device: " + error.message)
    }
  }

  const handleDeleteDevice = async (deviceId) => {
    if (!confirm("Are you sure you want to delete this device?")) return

    try {
      const { error } = await supabase.from("devices").delete().eq("id", deviceId)

      if (error) throw error

      setDevices(devices.filter((d) => d.id !== deviceId))
      alert("Device deleted successfully!")
    } catch (error) {
      console.error("Error deleting device:", error)
      alert("Failed to delete device")
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

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
                <p className="text-gray-600">You need admin privileges to access this page.</p>
              </CardContent>
            </Card>
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
              <p className="text-gray-600">Manage IoT devices and system settings</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus size={16} />
                  Create Device
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Device</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateDevice} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Device ID</label>
                    <Input
                      value={newDevice.device_id}
                      onChange={(e) => setNewDevice({ ...newDevice, device_id: e.target.value })}
                      placeholder="e.g., VM001, RD001, WP001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Device Name</label>
                    <Input
                      value={newDevice.name}
                      onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                      placeholder="Enter device name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Device Type</label>
                    <Select
                      value={newDevice.device_type}
                      onValueChange={(value) => setNewDevice({ ...newDevice, device_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vending_machine">Vending Machine</SelectItem>
                        <SelectItem value="relay_device">Relay Device</SelectItem>
                        <SelectItem value="water_pump">Water Pump</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newDevice.device_type === "vending_machine" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Liquid Type</label>
                        <Select
                          value={newDevice.liquid_type}
                          onValueChange={(value) => setNewDevice({ ...newDevice, liquid_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select liquid type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="milk">Milk</SelectItem>
                            <SelectItem value="cooking_oil">Cooking Oil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Max Capacity (ml)</label>
                        <Input
                          type="number"
                          value={newDevice.max_capacity}
                          onChange={(e) => setNewDevice({ ...newDevice, max_capacity: e.target.value })}
                          placeholder="5000"
                          min="1000"
                          max="10000"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Textarea
                      value={newDevice.description}
                      onChange={(e) => setNewDevice({ ...newDevice, description: e.target.value })}
                      placeholder="Enter device description"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Create Device
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <Card key={device.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={device.is_active ? "default" : "secondary"}>
                        {device.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant={device.status === "online" ? "default" : "outline"}>{device.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Device ID:</span>
                        <span className="font-mono">{device.device_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span>{device.device_type.replace("_", " ")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Owner:</span>
                        <span>{device.owner ? "Assigned" : "Unassigned"}</span>
                      </div>
                      {device.device_type === "vending_machine" && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Liquid:</span>
                          <span>{device.liquid_type}</span>
                        </div>
                      )}
                      {device.device_type === "relay_device" && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Channels:</span>
                          <span>{device.relay_channels?.length || 0}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{device.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings size={14} className="mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteDevice(device.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {devices.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-semibold mb-2">No Devices Created</h3>
                <p className="text-gray-600 mb-4">Create your first IoT device to get started</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>Create Device</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
