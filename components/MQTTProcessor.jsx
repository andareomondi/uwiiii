"use client"

import { useEffect } from "react"
import { createClient } from "@/utils/supabase/client"

export default function MQTTProcessor() {
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to real-time changes in mqtt_messages table
    const subscription = supabase
      .channel("mqtt_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mqtt_messages",
        },
        (payload) => {
          console.log("New MQTT message received:", payload.new)
          processNewMessage(payload.new)
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const processNewMessage = async (message) => {
    try {
      const { device_id, payload: messagePayload } = message

      if (!device_id || !messagePayload) return

      // Check if device exists in our database
      const { data: device } = await supabase.from("devices").select("*").eq("device_id", device_id).single()

      if (!device) {
        console.log("Device not found in database:", device_id)
        return
      }

      // Update device state based on payload
      const updates = {
        last_seen: new Date().toISOString(),
        status: "online",
      }

      if (messagePayload.state) {
        updates.state = messagePayload.state
      }

      if (messagePayload.level !== undefined) {
        updates.current_level = messagePayload.level
      }

      if (messagePayload.balance !== undefined) {
        updates.balance = messagePayload.balance
      }

      if (Object.keys(updates).length > 1) {
        // More than just timestamp and status
        await supabase.from("devices").update(updates).eq("device_id", device_id)
      }

      // Update relay channels if applicable
      if (messagePayload.channel_id && messagePayload.channel_state) {
        await supabase
          .from("relay_channels")
          .update({ state: messagePayload.channel_state })
          .eq("device_id", device.id)
          .eq("channel_number", messagePayload.channel_id)
      }

      // Mark message as processed
      await supabase.from("mqtt_messages").update({ processed: true }).eq("id", message.id)
    } catch (error) {
      console.error("Error processing MQTT message:", error)
    }
  }

  return null // This component doesn't render anything
}
