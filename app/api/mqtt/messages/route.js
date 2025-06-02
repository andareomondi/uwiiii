import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Fetch recent MQTT messages
    const { data: messages, error } = await supabase
      .from("mqtt_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json(messages || [])
  } catch (error) {
    console.error("Error fetching MQTT messages:", error)
    return NextResponse.json({ error: "Failed to fetch MQTT messages" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = createClient()
    const messageData = await request.json()

    // Process incoming MQTT message
    const { data, error } = await supabase.from("mqtt_messages").insert([
      {
        topic: messageData.topic,
        payload: messageData.payload,
        device_id: messageData.device_id,
        timestamp: messageData.timestamp || new Date().toISOString(),
      },
    ])

    if (error) throw error

    // Process device state updates
    if (messageData.device_id && messageData.payload) {
      await processDeviceStateUpdate(supabase, messageData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing MQTT message:", error)
    return NextResponse.json({ error: "Failed to process MQTT message" }, { status: 500 })
  }
}

async function processDeviceStateUpdate(supabase, messageData) {
  try {
    const { device_id, payload } = messageData

    // Check if device exists in our database
    const { data: device } = await supabase.from("devices").select("*").eq("device_id", device_id).single()

    if (!device) {
      console.log("Device not found in database:", device_id)
      return
    }

    // Update device state based on payload
    const updates = {}

    if (payload.state) {
      updates.state = payload.state
    }

    if (payload.level !== undefined) {
      updates.current_level = payload.level
    }

    if (payload.balance !== undefined) {
      updates.balance = payload.balance
    }

    if (Object.keys(updates).length > 0) {
      updates.last_seen = new Date().toISOString()
      updates.status = "online"

      await supabase.from("devices").update(updates).eq("device_id", device_id)
    }

    // Update relay channels if applicable
    if (payload.channel_id && payload.channel_state) {
      await supabase
        .from("relay_channels")
        .update({ state: payload.channel_state })
        .eq("device_id", device.id)
        .eq("channel_number", payload.channel_id)
    }
  } catch (error) {
    console.error("Error updating device state:", error)
  }
}
