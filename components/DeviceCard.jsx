"use client";

import { useState, useEffect, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { publishMQTTMessage } from "@/utils/mqtt";
import { useToast } from "@/hooks/use-toast";
import {
  Lightbulb,
  Fan,
  Zap,
  Thermometer,
  Droplets,
  Power,
  Settings,
  Wifi,
  WifiOff,
  Edit,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

const getDeviceIcon = (switchType) => {
  const iconClass = "w-5 h-5 text-purple-600 dark:text-purple-200";
  switch (switchType) {
    case "light":
      return <Lightbulb className={iconClass} />;
    case "fan":
      return <Fan className={iconClass} />;
    case "outlet":
      return <Zap className={iconClass} />;
    case "heater":
      return <Thermometer className={iconClass} />;
    case "pump":
      return <Droplets className={iconClass} />;
    default:
      return <Power className={iconClass} />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "online":
      return "text-green-500";
    case "offline":
      return "text-gray-400";
    case "error":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
};

// Valid switch types that match our database constraint
const VALID_SWITCH_TYPES = [
  { value: "light", label: "Light" },
  { value: "fan", label: "Fan" },
  { value: "outlet", label: "Outlet" },
  { value: "heater", label: "Heater" },
  { value: "pump", label: "Pump" },
];

export default function DeviceCard({ device, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const [editingChannel, setEditingChannel] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [localDevice, setLocalDevice] = useState(device);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Memoize the supabase client to prevent recreating on every render
  const supabase = useMemo(() => createClient(), []);

  // Update local device when prop changes
  useEffect(() => {
    setLocalDevice(device);
  }, [device]);

  useEffect(() => {
    // Bail early if we don't have required IDs
    if (!device?.id) {
      console.warn("🚫 Missing device id for subscription.");
      return;
    }

    console.log("🔄 Setting up real-time subscription for device:", device.id);

    const channel = supabase
      .channel(`device_updates_${device.id}_${Date.now()}`) // Add timestamp to make channel unique
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "devices",
          filter: `id=eq.${device.id}`, // Filter by device.id, not device_id
        },
        (payload) => {
          console.log("✅ Realtime device update:", payload);

          if (
            payload.eventType === "UPDATE" ||
            payload.eventType === "INSERT"
          ) {
            setLocalDevice((prev) => ({
              ...prev,
              ...payload.new,
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "relay_channels",
          filter: `device_id=eq.${device.id}`,
        },
        (payload) => {
          console.log("✅ Realtime channel update:", payload);

          if (
            payload.eventType === "UPDATE" ||
            payload.eventType === "INSERT"
          ) {
            setLocalDevice((prev) => ({
              ...prev,
              relay_channels:
                prev.relay_channels?.map((channel) =>
                  channel.id === payload.new.id
                    ? { ...channel, ...payload.new }
                    : channel
                ) || [],
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to real-time updates");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Real-time subscription error");
        }
      });

    return () => {
      console.log("🧹 Cleaning up subscription for device:", device.id);
      supabase.removeChannel(channel);
    };
  }, [device.id, supabase]);

  // Auto-refresh every 45 seconds as fallback
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing device data...");
      setLastRefresh(new Date());

      if (onUpdate && typeof onUpdate === "function") {
        try {
          onUpdate();
        } catch (err) {
          console.error("❌ Failed to auto-refresh:", err);
        }
      }
    }, 45000); // 45 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [onUpdate]);

  const handleToggle = async (channelId, newState) => {
    setIsLoading(true);

    try {
      const channel = device.relay_channels?.find((ch) => ch.id === channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      // 1. Update database first
      const { error: dbError } = await supabase
        .from("relay_channels")
        .update({
          state: newState ? "on" : "off",
          updated_at: new Date().toISOString(),
        })
        .eq("id", channelId);

      if (dbError) {
        console.error("Database update error:", dbError);
        throw dbError;
      }

      // 2. Then publish MQTT message
      const message = {
        type: "toggle",
        content: `OUT_${channel.channel_number}`,
      };

      await publishMQTTMessage(`${device.device_id}`, message);

      toast({
        title: "Success",
        description: `Device ${
          newState ? "turned on" : "turned off"
        } successfully`,
      });

      // 3. Reload to reflect changes
      if (onUpdate && typeof onUpdate === "function") {
        setTimeout(() => {
          onUpdate();
        }, 500); // Small delay to ensure database is updated
      }
    } catch (error) {
      console.error("Error controlling device:", error);

      toast({
        title: "Error",
        description: "Failed to control device. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVendingMachineDispense = async (amount) => {
    setIsLoading(true);
    try {
      // 1. Update database first
      const newLevel = Math.max(0, (device.current_level || 0) - amount);

      const { error: dbError } = await supabase
        .from("devices")
        .update({
          current_level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", device.id);

      if (dbError) {
        console.error("Database update error:", dbError);
        throw dbError;
      }

      // 2. Then publish MQTT message (without timestamp)
      const message = {
        device_id: device.device_id,
        action: "dispense",
        amount: amount,
      };

      await publishMQTTMessage(
        `vendorflow/vending/${device.device_id}/control`,
        message
      );

      toast({
        title: "Success",
        description: `Dispensed ${amount}ml successfully`,
      });

      // 3. Reload to reflect changes
      if (onUpdate && typeof onUpdate === "function") {
        setTimeout(() => {
          onUpdate();
        }, 500);
      }
    } catch (error) {
      console.error("Error dispensing:", error);
      toast({
        title: "Error",
        description: "Failed to dispense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWaterPumpToggle = async (newState) => {
    setIsLoading(true);

    try {
      // 1. Update database first
      const { error: dbError } = await supabase
        .from("devices")
        .update({
          state: newState ? "on" : "off",
          updated_at: new Date().toISOString(),
        })
        .eq("id", device.id);

      if (dbError) {
        console.error("Database update error:", dbError);
        throw dbError;
      }

      // 2. Then publish MQTT message (without timestamp)
      const message = {
        type: "pump_control",
        action: newState ? "start" : "stop",
      };

      await publishMQTTMessage(`${device.device_id}`, message);

      toast({
        title: "Success",
        description: `Pump ${newState ? "started" : "stopped"} successfully`,
      });

      // 3. Reload to reflect changes
      if (onUpdate && typeof onUpdate === "function") {
        setTimeout(() => {
          onUpdate();
        }, 500);
      }
    } catch (error) {
      console.error("Error controlling pump:", error);

      toast({
        title: "Error",
        description: "Failed to control pump. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditChannel = (channel) => {
    const validSwitchType =
      VALID_SWITCH_TYPES.find((type) => type.value === channel.gui_switch_type)
        ?.value || "light";

    setEditingChannel({
      id: channel.id,
      display_name: channel.display_name || "",
      gui_switch_type: validSwitchType,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateChannel = async () => {
    if (!editingChannel) return;

    setIsUpdating(true);

    try {
      const validSwitchType = VALID_SWITCH_TYPES.find(
        (type) => type.value === editingChannel.gui_switch_type
      );
      if (!validSwitchType) {
        toast({
          title: "Validation Error",
          description: "Invalid switch type selected.",
          variant: "destructive",
        });
        return;
      }

      const updateData = {
        display_name: editingChannel.display_name.trim() || "Unnamed Channel",
        gui_switch_type: validSwitchType.value,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("relay_channels")
        .update(updateData)
        .eq("id", editingChannel.id);

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Channel updated successfully!",
      });

      setIsEditDialogOpen(false);
      setEditingChannel(null);

      // Reload to reflect changes
      if (onUpdate && typeof onUpdate === "function") {
        setTimeout(() => {
          onUpdate();
        }, 500);
      }
    } catch (error) {
      console.error("Error updating channel:", error);

      toast({
        title: "Error",
        description: `Failed to update channel: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseDialog = () => {
    setIsEditDialogOpen(false);
    setEditingChannel(null);
  };

  // Use local device state for rendering
  const displayDevice = localDevice;

  if (displayDevice.device_type === "vending_machine") {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-0 shadow-lg rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-2xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-200" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">
                  {displayDevice.name}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {displayDevice.liquid_type} Dispenser
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {displayDevice.status === "online" ? (
                <Wifi
                  className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`}
                />
              ) : (
                <WifiOff
                  className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`}
                />
              )}
              <div className="text-xs text-gray-400 ml-2">
                {lastRefresh.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Level */}
          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Current Level
            </span>
            <span className="text-lg font-bold text-blue-600">
              {displayDevice.current_level || 0}ml
            </span>
          </div>

          {/* Remaining Stock */}
          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Remaining Stock
            </span>
            <span className="text-lg font-bold text-blue-600">
              {displayDevice.stock || 0}ml
            </span>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-white/60 rounded-2xl text-sm">
              <p className="text-gray-500 dark:text-gray-400">Total Volume</p>
              <p className="font-bold text-blue-600">
                {displayDevice.total_volume || 0}L
              </p>
            </div>
            <div className="p-3 bg-white/60 rounded-2xl text-sm">
              <p className="text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="font-bold text-blue-600">
                KSh {displayDevice.total_amount || 0}
              </p>
            </div>
          </div>

          {/* Price */}
          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Price
            </span>
            <span className="text-sm font-mono text-blue-600">
              KSh {displayDevice.price || "N/A"}
            </span>
          </div>

          {/* Phone Number */}
          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              SMS Number
            </span>
            <span className="text-sm font-mono text-blue-600">
              {displayDevice.phone_number || "Not set"}
            </span>
          </div>

          {/* SMS Commands */}
          {displayDevice.phone_number && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                SMS Commands (when offline):
              </p>
              <div className="space-y-1 text-xs font-mono">
                <div>• DISPENSE 100 - Dispense 100ml</div>
                <div>• DISPENSE 250 - Dispense 250ml</div>
                <div>• DISPENSE 500 - Dispense 500ml</div>
                <div>• STATUS - Get device status</div>
              </div>
            </div>
          )}

          {/* Dispense Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[100, 250, 500].map((amount) => (
              <Button
                key={amount}
                size="sm"
                onClick={() => handleVendingMachineDispense(amount)}
                disabled={isLoading}
                className={`bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-10 transition-all duration-200 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `${amount}ml`
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayDevice.device_type === "water_pump") {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 border-0 shadow-lg rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-2xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-green-600 dark:text-green-200" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">
                  {displayDevice.name}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Water Pump Controller
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {displayDevice.status === "online" ? (
                <Wifi
                  className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`}
                />
              ) : (
                <WifiOff
                  className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`}
                />
              )}
              <div className="text-xs text-gray-400">
                {lastRefresh.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <Switch
                checked={displayDevice.state === "on"}
                onCheckedChange={(checked) => handleWaterPumpToggle(checked)}
                disabled={isLoading}
                className={isLoading ? "opacity-50" : ""}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Water Balance
            </span>
            <span className="text-lg font-bold text-green-600">
              {displayDevice.balance || 0}L
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              SMS Number
            </span>
            <span className="text-sm font-mono text-green-600">
              {displayDevice.phone_number || "Not set"}
            </span>
          </div>

          {displayDevice.phone_number && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                SMS Commands (when offline):
              </p>
              <div className="space-y-1 text-xs font-mono">
                <div>• START - Start the pump</div>
                <div>• STOP - Stop the pump</div>
                <div>• STATUS - Get pump status</div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center p-3 bg-white/60 rounded-2xl">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Status
            </span>
            <Badge
              variant={displayDevice.state === "on" ? "default" : "secondary"}
              className="rounded-full"
            >
              {displayDevice.state === "on" ? "Running" : "Stopped"}
            </Badge>
          </div>
          <br />
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Price:</span>
            <span className="font-mono text-sm">
              KSh: {device.price || "N/A"}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Relay device with modern design
  return (
    <>
      <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 border-0 shadow-lg rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-2xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-600 dark:text-purple-200" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">
                  {displayDevice.name}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Relay Controller
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {displayDevice.status === "online" ? (
                <Wifi
                  className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`}
                />
              ) : (
                <WifiOff
                  className={`w-4 h-4 ${getStatusColor(displayDevice.status)}`}
                />
              )}
              <div className="text-xs text-gray-400 ml-2">
                {lastRefresh.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Channels (Read-only indicators) */}
          {displayDevice.relay_channels?.filter(
            (ch) => ch.channel_type === "input"
          ).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Input Status
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {displayDevice.relay_channels
                  ?.filter((ch) => ch.channel_type === "input")
                  .map((channel) => (
                    <div
                      key={channel.id}
                      className="flex flex-col items-center p-2 bg-white/60 dark:bg-gray-700/60 rounded-xl transition-all duration-200"
                    >
                      <div
                        className={`w-3 h-3 rounded-full mb-1 transition-colors duration-200 ${
                          channel.state === "on"
                            ? "bg-green-400 shadow-lg shadow-green-200"
                            : "bg-gray-300"
                        }`}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
                        {channel.display_name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Output Channels (Toggleable controls) */}
          {displayDevice.relay_channels?.filter(
            (ch) => ch.channel_type === "output"
          ).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Output Controls
              </h4>
              <div className="space-y-2">
                {displayDevice.relay_channels
                  ?.filter((ch) => ch.channel_type === "output")
                  .map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-700/60 rounded-2xl transition-all duration-200 hover:bg-white/80 dark:hover:bg-gray-700/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-xl flex items-center justify-center">
                          {getDeviceIcon(channel.gui_switch_type)}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-800 dark:text-white">
                            {channel.display_name}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {channel.gui_switch_type}
                          </p>
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
                          {isUpdating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Edit size={14} />
                          )}
                        </Button>
                        <Switch
                          checked={channel.state === "on"}
                          onCheckedChange={(checked) =>
                            handleToggle(channel.id, checked)
                          }
                          disabled={isLoading}
                          className={isLoading ? "opacity-50" : ""}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {displayDevice.phone_number && (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-gray-700/60 rounded-2xl">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  SMS Number
                </span>
                <span className="text-sm font-mono text-purple-600">
                  {displayDevice.phone_number}
                </span>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  SMS Commands (when offline):
                </p>
                <div className="space-y-1 text-xs font-mono">
                  <div>• ON_1 - Turn on channel 1</div>
                  <div>• OFF_1 - Turn off channel 1</div>
                </div>
              </div>
              <br />
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Price:</span>
                <span className="font-mono text-sm">
                  KSh: {device.price || "N/A"}
                </span>
              </div>
            </div>
          )}

          {(!displayDevice.relay_channels ||
            displayDevice.relay_channels.length === 0) && (
            <div className="text-center py-6 text-gray-500">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No channels configured
              </p>
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
                <label className="block text-sm font-medium mb-1">
                  Display Name
                </label>
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
                <label className="block text-sm font-medium mb-1">
                  Switch Type
                </label>
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
                <Button
                  onClick={handleUpdateChannel}
                  className="flex-1"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
// This code defines a DeviceCard component that displays device information and allows interaction with devices.
// It supports different device types like vending machines, water pumps, and relay controllers.
