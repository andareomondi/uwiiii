import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Fetch recent MQTT messages
    const { data: messages, error } = await supabase
      .from("mqtt_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(messages || []);
  } catch (error) {
    console.error("Error fetching MQTT messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch MQTT messages" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const messageData = await request.json();

    // await the json packates then add them to the database
    const { data, error } = await supabase.from("mqtt_messages").insert([
      {
        topic: messageData.topic,
        payload: messageData.payload,
        device_id: messageData.device_id,
        timestamp: messageData.timestamp || new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    // Process device state updates
    if (messageData.device_id && messageData.payload) {
      await processDeviceStateUpdate(supabase, messageData);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing MQTT message:", error);
    return NextResponse.json(
      { error: "Failed to process MQTT message" },
      { status: 500 }
    );
  }
}
export async function processDeviceStateUpdate(supabase, messageData) {
  try {
    const { device_id, payload } = messageData;

    // Step 1: Look up device by external ID (device_id is a string)
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_id", device_id)
      .single();

    if (deviceError || !device) {
      console.error("Device not found:", device_id);
      return;
    }

    // Step 2: Update general device fields
    const updates = {};

    if (payload.state) updates.state = payload.state;
    if (payload.level !== undefined) updates.current_level = payload.level;
    if (payload.balance !== undefined) updates.balance = payload.balance;

    if (Object.keys(updates).length > 0) {
      updates.last_seen = new Date().toISOString();
      updates.status = "online";

      await supabase
        .from("devices")
        .update(updates)
        .eq("device_id", device_id);
    }

    // Step 3: Process both input and output channels
    for (const key in payload) {
      const match = key.match(/^(OUT|IN)_(\d+)$/);
      if (match) {
        const [_, channelType, channelNumStr] = match;
        const channel_number = parseInt(channelNumStr);
        const channel_state = payload[key]?.toLowerCase?.() ?? "off";
        const channel_type = channelType === "OUT" ? "output" : "input";

        console.log("Updating relay channel", {
          channel_type,
          channel_number,
          channel_state,
          device_uuid: device.id,
        });

        const { data, error } = await supabase
          .from("relay_channels")
          .update({ state: channel_state })
          .eq("device_id", device.id)
          .eq("channel_number", channel_number)
          .eq("channel_type", channel_type);

        if (error) {
          console.error(`Relay ${channel_type} update error:`, error);
        } else if (!data || data.length === 0) {
          console.warn(`No matching ${channel_type} channel found for ${channelType}_${channel_number}`);
        }
      }
    }
  } catch (error) {
    console.error("Error updating device state:", error);
  }
}



