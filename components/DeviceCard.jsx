"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { publishMQTTMessage } from "@/utils/mqtt"
import { useToast } from "@/hooks/use-toast"
import { Lightbulb, Fan, Zap, Thermometer, Droplets, Power, Settings, Wifi, WifiOff, Edit, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"

const getDeviceIcon = (switchType) => {
  switch (switchType) {
    case "light":
      return <Lightbulb className="w-5 h-5" />
    case "fan":
      return <Fan className="w-5 h-5" />
    case "outlet":
      return <Zap className="w-5 h-5" />
    case "heater":
      return <Thermometer className="w-5 h-5" />
    case "pump":
      return <Droplets className="w-5 h-5" />
    default:
      return <Power className="w-5 h-5" />
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case "online":
      return "text-green-500"
    case "offline":
      return "text-gray-400"
    case "error":
      return "text-red-500"
    default:
      return "text-gray-400"
  }
}

// Valid switch types that match our database constraint
const VALID_SWITCH_TYPES = [
  { value: "light", label: "Light" },
  { value: "fan", label: "Fan" },
  { value: "outlet", label: "Outlet" },
  { value: "heater", label: "Heater" },
  { value: "pump", label: "Pump" },
]

export default function DeviceCard({ device, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const [editingChannel, setEditingChannel] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [localDevice, setLocalDevice] = useState(device)

  const handleToggle = async (channelId, newState) => {
    setIsLoading(true)

    // Optimistic update - update UI immediately
    setLocalDevice((prev) => ({
      ...prev,
      relay_channels:
        prev.relay_channels?.map((channel) =>
          channel.id === channelId ? { ...channel, state: newState ? "on" : "off" } : channel,
        ) || [],
    }))

    try {
      const message = {
        device_id: device.device_id,
        channel_id: channelId,
        state: newState ? "on" : "off",
        timestamp: new Date().toISOString(),
      }

      await publishMQTTMessage(`vendorflow/device/${device.device_id}/control`, message)

      toast({
        title: "Success",
        description: `Device ${newState ? "turned on" : "turned off"} successfully`,
        variant: "success",
      })

      // Call onUpdate but don't wait for it to prevent page reload
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error("Error controlling device:", error)

      // Revert optimistic update on error
      setLocalDevice((prev) => ({
        ...prev,
        relay_channels:
          prev.relay_channels?.map((channel) =>
            channel.id === channelId ? { ...channel, state: newState ? "off" : "on" } : channel,
          ) || [],
      }))

      toast({
        title: "Error",
        description: "Failed to control device. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVendingMachineDispense = async (amount) => {
    setIsLoading(true)
    try {
      const message = {
        device_id: device.device_id,
        action: "dispense",
        amount: amount,
        timestamp: new Date().toISOString(),
      }

      await publishMQTTMessage(`vendorflow/vending/${device.device_id}/control`, message)

      toast({
        title: "Success",
        description: `Dispensed ${amount}ml successfully`,
        variant: "success",
      })

      // Optimistic update for liquid level
      setLocalDevice((prev) => ({
        ...prev,
        current_level: Math.max(0, (prev.current_level || 0) - amount),
      }))

      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error("Error dispensing:", error)
      toast({
        title: "Error",
        description: "Failed to dispense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditChannel = (channel) => {
    const validSwitchType = VALID_SWITCH_TYPES.find((type) => type.value === channel.gui_switch_type)?.value || "light"

    setEditingChannel({
      id: channel.id,
      display_name: channel.display_name || "",
      gui_switch_type: validSwitchType,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateChannel = async () => {
    if (!editingChannel) return

    setIsUpdating(true)

    try {
      const supabase = createClient()

      const validSwitchType = VALID_SWITCH_TYPES.find((type) => type.value === editingChannel.gui_switch_type)
      if (!validSwitchType) {
        toast({
          title: "Validation Error",
          description: "Invalid switch type selected.",
          variant: "destructive",
        })
        return
      }

      const updateData = {
        display_name: editingChannel.display_name.trim() || "Unnamed Channel",
        gui_switch_type: validSwitchType.value,
      }

      // Optimistic update - update local state immediately
      setLocalDevice((prev) => ({
        ...prev,
        relay_channels:
          prev.relay_channels?.map((channel) =>
            channel.id === editingChannel.id ? { ...channel, ...updateData } : channel,
          ) || [],
      }))

      const { error } = await supabase.from("relay_channels").update(updateData).eq("id", editingChannel.id)

      if (error) {
        console.error("Database error:", error)
        throw error
      }

      toast({
        title: "Success",
        description: "Channel updated successfully!",
        variant: "success",
      })

      setIsEditDialogOpen(false)
      setEditingChannel(null)

      // Refresh data in background without blocking UI
      if (onUpdate) {
        setTimeout(() => onUpdate(), 100)
      }
    } catch (error) {
      console.error("Error updating channel:", error)

      // Revert optimistic update on error
      setLocalDevice(device)

      toast({
        title: "Error",
        description: `Failed to update channel: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCloseDialog = () => {
    setIsEditDialogOpen(false)
    setEditingChannel(null)
  }

  // Use local device state for rendering
  const displayDevice = localDevice

  if (displayDevice.device_type === "vending_machine") {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-white border-0 shadow-lg rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">{displayDevice.name}</CardTitle>
                <p className="text-sm text-gray-500 capitalize">{displayDevice.liquid_type} Dispenser</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {displayDevice.status === "online" ? (
                <Wifi className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`} />
              ) : (
                <WifiOff className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600">Current Level</span>
            <span className="text-lg font-bold text-blue-600">{displayDevice.current_level || 0}ml</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[100, 250, 500].map((amount) => (
              <Button
                key={amount}
                size="sm"
                onClick={() => handleVendingMachineDispense(amount)}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-10 transition-all duration-200"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `${amount}ml`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (displayDevice.device_type === "water_pump") {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-white border-0 shadow-lg rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">{displayDevice.name}</CardTitle>
                <p className="text-sm text-gray-500">Water Pump Controller</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {displayDevice.status === "online" ? (
                <Wifi className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`} />
              ) : (
                <WifiOff className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`} />
              )}
              <Switch
                checked={displayDevice.state === "on"}
                onCheckedChange={(checked) => handleToggle(displayDevice.id, checked)}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600">Water Balance</span>
            <span className="text-lg font-bold text-green-600">{displayDevice.balance || 0}L</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <Badge variant={displayDevice.state === "on" ? "default" : "secondary"} className="rounded-full">
              {displayDevice.state === "on" ? "Running" : "Stopped"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Relay device with modern design
  return (
    <>
      <Card className="bg-gradient-to-br from-purple-50 to-white border-0 shadow-lg rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">{displayDevice.name}</CardTitle>
                <p className="text-sm text-gray-500">Relay Controller</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {displayDevice.status === "online" ? (
                <Wifi className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`} />
              ) : (
                <WifiOff className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Channels (Read-only indicators) */}
          {displayDevice.relay_channels?.filter((ch) => ch.channel_type === "input").length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-600">Input Status</h4>
              <div className="grid grid-cols-4 gap-2">
                {displayDevice.relay_channels
                  ?.filter((ch) => ch.channel_type === "input")
                  .map((channel) => (
                    <div
                      key={channel.id}
                      className="flex flex-col items-center p-2 bg-white/60 rounded-xl transition-all duration-200"
                    >
                      <div
                        className={`w-3 h-3 rounded-full mb-1 transition-colors duration-200 ${
                          channel.state === "on" ? "bg-green-400 shadow-lg shadow-green-200" : "bg-gray-300"
                        }`}
                      />
                      <span className="text-xs text-gray-600 text-center">{channel.display_name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Output Channels (Toggleable controls) */}
          {displayDevice.relay_channels?.filter((ch) => ch.channel_type === "output").length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-600">Output Controls</h4>
              <div className="space-y-2">
                {displayDevice.relay_channels
                  ?.filter((ch) => ch.channel_type === "output")
                  .map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-3 bg-white/60 rounded-2xl transition-all duration-200 hover:bg-white/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                          {getDeviceIcon(channel.gui_switch_type)}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-800">{channel.display_name}</span>
                          <p className="text-xs text-gray-500 capitalize">{channel.gui_switch_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditChannel(channel)}
                          className="h-8 w-8 p-0 hover:bg-purple-100 transition-colors duration-200"
                          disabled={isUpdating}
                        >
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Edit size={14} />}
                        </Button>
                        <Switch
                          checked={channel.state === "on"}
                          onCheckedChange={(checked) => handleToggle(channel.id, checked)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {(!displayDevice.relay_channels || displayDevice.relay_channels.length === 0) && (
            <div className="text-center py-6 text-gray-500">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No channels configured</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Channel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
          </DialogHeader>
          {editingChannel && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <Input
                  value={editingChannel.display_name}
                  onChange={(e) =>
                    setEditingChannel({
                      ...editingChannel,
                      display_name: e.target.value,
                    })
                  }
                  placeholder="Enter display name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Switch Type</label>
                <Select
                  value={editingChannel.gui_switch_type}
                  onValueChange={(value) =>
                    setEditingChannel({
                      ...editingChannel,
                      gui_switch_type: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_SWITCH_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateChannel} className="flex-1" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button variant="outline" onClick={handleCloseDialog} disabled={isUpdating}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
