"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { publishMQTTMessage } from "@/utils/mqtt"
import { useToast } from "@/hooks/use-toast"

export default function DeviceCard({ device, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleToggle = async (channelId, newState) => {
    setIsLoading(true)
    try {
      const message = {
        device_id: device.device_id,
        channel_id: channelId,
        state: newState ? "on" : "off",
        timestamp: new Date().toISOString(),
      }

      await publishMQTTMessage(`device/${device.device_id}/control`, message)

      toast({
        title: "Success",
        description: `Device ${newState ? "turned on" : "turned off"} successfully`,
        variant: "success",
      })

      onUpdate && onUpdate()
    } catch (error) {
      console.error("Error controlling device:", error)
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

      await publishMQTTMessage(`vending/${device.device_id}/control`, message)

      toast({
        title: "Success",
        description: `Dispensed ${amount}ml successfully`,
        variant: "success",
      })

      onUpdate && onUpdate()
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

  if (device.device_type === "vending_machine") {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-white border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">{device.name}</CardTitle>
          <p className="text-sm text-gray-600">{device.liquid_type}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Level:</span>
              <span className="font-semibold">{device.current_level || 0}ml</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`font-semibold ${device.status === "online" ? "text-green-600" : "text-gray-600"}`}>
                {device.status || "offline"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleVendingMachineDispense(100)}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600"
              >
                100ml
              </Button>
              <Button
                size="sm"
                onClick={() => handleVendingMachineDispense(250)}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600"
              >
                250ml
              </Button>
              <Button
                size="sm"
                onClick={() => handleVendingMachineDispense(500)}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600"
              >
                500ml
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (device.device_type === "water_pump") {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-white border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">{device.name}</CardTitle>
          <p className="text-sm text-gray-600">Water Pump Controller</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`font-semibold ${device.state === "on" ? "text-green-600" : "text-gray-600"}`}>
                {device.state === "on" ? "Running" : "Stopped"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Balance:</span>
              <span className="font-semibold">{device.balance || 0}L</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Connection:</span>
              <span className={`font-semibold ${device.status === "online" ? "text-green-600" : "text-gray-600"}`}>
                {device.status || "offline"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Control:</span>
              <Switch
                checked={device.state === "on"}
                onCheckedChange={(checked) => handleToggle(device.id, checked)}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Relay device
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-white border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">{device.name}</CardTitle>
        <p className="text-sm text-gray-600">Relay Controller</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-600">Connection:</span>
            <span className={`font-semibold ${device.status === "online" ? "text-green-600" : "text-gray-600"}`}>
              {device.status || "offline"}
            </span>
          </div>
          {device.relay_channels && device.relay_channels.length > 0 ? (
            device.relay_channels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    {channel.gui_switch_type === "light" && "💡"}
                    {channel.gui_switch_type === "fan" && "🌀"}
                    {channel.gui_switch_type === "outlet" && "🔌"}
                  </div>
                  <span className="text-sm font-medium">{channel.display_name}</span>
                </div>
                <Switch
                  checked={channel.state === "on"}
                  onCheckedChange={(checked) => handleToggle(channel.id, checked)}
                  disabled={isLoading}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No channels configured</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
