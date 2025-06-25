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
async function processDeviceStateUpdate(supabase, messageData) {
  try {
    const { device_id, payload } = messageData;

    // Check if device exists
    const { data: device } = await supabase
      .from("devices")
      .select("*")
      .eq("device_id", device_id)
      .single();

    if (!device) {
      console.log("Device not found:", device_id);
      return;
    }

    const updates = {};

    if (payload.state) updates.state = payload.state;
    if (payload.level !== undefined) updates.current_level = payload.level;
    if (payload.balance !== undefined) updates.balance = payload.balance;

    if (Object.keys(updates).length > 0) {
      updates.last_seen = new Date().toISOString();
      updates.status = "online";

      await supabase.from("devices").update(updates).eq("device_id", device_id);
    }

    console.log("i passed here");
    for (const key in payload) {
      if (key.startsWith("OUT_")) {
        // Also i should point out that some of the json packates which are send by the device alternatively maycountain the IN_(number) for the imput channels so we should handle that use case.
        const channel_number = parseInt(key.split("_")[1]);
        const channel_state = payload[key]?.toUpperCase?.() ?? "OFF";

        console.log("Updating channel", {
          channel_number,
          channel_state,
          device_id: device.device_id,
        });

        const { data, error } = await supabase
          .from("relay_channels")
          .update({ state: channel_state })
          /* 
          this is where the issue is arising. In the sense that it's quering the device id of the relay device which in the supabase is a uuid key. SO there is another issue where we should query it based on the device_id of the parent relay device whose uuid is the device id column in the supabase relay_channels table
          Confusing am aware. But this is coding summanrized in a nutshell. Anyway am happy we are making progress.
          */
          .eq("device_id", device.device_id)
          .eq("channel_number", channel_number);

        if (error) {
          console.error("Relay update error:", error);
        } else if (!data || data.length === 0) {
          console.warn("No matching relay channel found");
        }
      }
    }
  } catch (error) {
    console.error("Error updating device state:", error);
  }
}
