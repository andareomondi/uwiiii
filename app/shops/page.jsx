"use client"

import { useState, useEffect } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navigation from "@/components/Navigation"
import DeviceCard from "@/components/DeviceCard"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Store, MapPin } from "lucide-react"

export default function ShopsPage() {
  const [shops, setShops] = useState([])
  const [selectedShop, setSelectedShop] = useState(null)
  const [shopDevices, setShopDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newShop, setNewShop] = useState({ name: "", description: "", location: "" })
  const supabase = createClient()

  useEffect(() => {
    fetchShops()
  }, [])

  useEffect(() => {
    if (selectedShop) {
      fetchShopDevices(selectedShop.id)
    }
  }, [selectedShop])

  const fetchShops = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("shops")
        .select("*")
        .eq("owner", user.id)
        .order("created_at", { ascending: false })

      setShops(data || [])
      if (data && data.length > 0 && !selectedShop) {
        setSelectedShop(data[0])
      }
    } catch (error) {
      console.error("Error fetching shops:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchShopDevices = async (shopId) => {
    try {
      const { data } = await supabase
        .from("devices")
        .select(`
          *,
          relay_channels (*)
        `)
        .eq("shop_id", shopId)
        .eq("device_type", "vending_machine")

      setShopDevices(data || [])
    } catch (error) {
      console.error("Error fetching shop devices:", error)
    }
  }

  const handleCreateShop = async (e) => {
    e.preventDefault()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("shops")
        .insert([{ ...newShop, owner: user.id }])
        .select()

      if (error) throw error

      setShops([data[0], ...shops])
      setNewShop({ name: "", description: "", location: "" })
      setIsCreateDialogOpen(false)
      alert("Shop created successfully!")
    } catch (error) {
      console.error("Error creating shop:", error)
      alert("Failed to create shop")
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Shops</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your vending machine locations</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus size={16} />
                  Create Shop
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-gray-900 dark:text-white">Create New Shop</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateShop} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Shop Name</label>
                    <Input
                      value={newShop.name}
                      onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                      placeholder="Enter shop name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Location</label>
                    <Input
                      value={newShop.location}
                      onChange={(e) => setNewShop({ ...newShop, location: e.target.value })}
                      placeholder="Enter shop location"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <Textarea
                      value={newShop.description}
                      onChange={(e) => setNewShop({ ...newShop, description: e.target.value })}
                      placeholder="Enter shop description"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Create Shop
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Shops List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Store size={20} />
                    Shops ({shops.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {shops.map((shop) => (
                      <button
                        key={shop.id}
                        onClick={() => setSelectedShop(shop)}
                        className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedShop?.id === shop.id
                            ? "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500"
                            : ""
                          }`}
                      >
                        <div className="font-medium">{shop.name}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin size={12} />
                          {shop.location}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Shop Details */}
            <div className="lg:col-span-3">
              {selectedShop ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-white">{selectedShop.name}</CardTitle>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin size={16} />
                        {selectedShop.location}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 dark:text-gray-300">{selectedShop.description}</p>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{shopDevices.length}</div>
                          <div className="text-sm text-gray-600">Vending Machines</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {shopDevices.filter((d) => d.status === "online").length}
                          </div>
                          <div className="text-sm text-gray-600">Online</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {shopDevices.reduce((sum, d) => sum + (d.current_level || 0), 0)}ml
                          </div>
                          <div className="text-sm text-gray-600">Total Liquid</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <h3 className="text-xl font-semibold mb-4">Vending Machines</h3>
                    {shopDevices.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {shopDevices.map((device) => (
                          <DeviceCard
                            key={device.id}
                            device={device}
                            onUpdate={() => fetchShopDevices(selectedShop.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <Card className="text-center py-12">
                        <CardContent>
                          <div className="text-6xl mb-4">🥤</div>
                          <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                            No Vending Machines
                          </h4>
                          <a href="/marketplace" className="text-gray-600 dark:text-gray-400 mb-4">
                            Add vending machines to this shop from the marketplace
                          </a>
                          <Button>Browse Marketplace</Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <div className="text-6xl mb-4">🏪</div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">No Shops Created</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Create your first shop to start managing vending machines
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>Create Shop</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
