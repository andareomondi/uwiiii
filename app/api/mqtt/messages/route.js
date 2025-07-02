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
    let extractedDeviceId = messageData.device_id;

    // Try to extract from topic if not explicitly given
    if (!extractedDeviceId && messageData.topic) {
      const topicParts = messageData.topic.split("/");
      extractedDeviceId = topicParts.length >= 2 ? topicParts[1] : null;
      console.log("Extracted device_id from topic:", extractedDeviceId);
    }

    // await the json packates then add them to the database
    const { data, error } = await supabase.from("mqtt_messages").insert([
      {
        topic: messageData.topic,
        payload: messageData.payload,
        device_id: extractedDeviceId,
        timestamp: messageData.timestamp || new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    // Process device state updates
    if (extractedDeviceId && messageData.payload) {
      await processDeviceStateUpdate(supabase, {
        ...messageData,
        device_id: extractedDeviceId, // override or add it
      });
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
    console.log("test 1");

    const { device_id, payload } = messageData;
    console.log("test 2", device_id, payload);
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
    await supabase
      .from("devices")
      .update({
        last_seen: new Date().toISOString(),
        status: "online",
      })
      .eq("device_id", device_id);

    // Step 2: Update general device fields
    const updates = {
      last_seen: new Date().toISOString(),
      status: "online",
    };

    if (device.device_type === "water_pump") {
      // Handle balance update
      if (payload.balance !== undefined) {
        const balanceValue = Number.parseFloat(payload.balance);
        if (!isNaN(balanceValue)) {
          updates.balance = balanceValue;
          console.log("Updated water pump balance:", balanceValue);
        }
      }

      // Handle valve status (open/closed -> on/off)
      if (payload.valve_status) {
        const valveState = payload.valve_status.toLowerCase();
        updates.state = valveState === "open" ? "on" : "off";
        console.log("Updated water pump valve state:", updates.state);
      }
    }
    if (device.device_type === "vending_machine") {
      console.log("we are here");
      // Parse values from payload safely
      const amount = parseFloat(payload.amount);
      const volume = parseFloat(payload.volume);
      const total_amount = parseFloat(payload.total_amount);
      const total_volume = parseFloat(payload.total_volume);
      const stock = parseFloat(payload.stock);

      // 1. Insert transaction log
      if (!isNaN(amount) && !isNaN(volume)) {
        const { error: insertError } = await supabase
          .from("vending_logs")
          .insert([
            {
              device_id: device.id,
              amount,
              volume,
            },
          ]);

        if (insertError) {
          console.error("Failed to insert vending log:", insertError);
        } else {
          console.log("Inserted vending log:", { amount, volume });
        }
      }

      // 2. Update device with new totals and stock
      const vendingUpdates = {};
      if (!isNaN(total_amount)) vendingUpdates.total_amount = total_amount;
      if (!isNaN(total_volume)) vendingUpdates.total_volume = total_volume;
      if (!isNaN(stock)) vendingUpdates.stock = stock;

      if (Object.keys(vendingUpdates).length > 0) {
        const { error: vendingUpdateError } = await supabase
          .from("devices")
          .update(vendingUpdates)
          .eq("id", device.id);

        if (vendingUpdateError) {
          console.error(
            "Failed to update vending device stats:",
            vendingUpdateError
          );
        } else {
          console.log("Updated vending stats:", vendingUpdates);
        }
      }
    }

    // Step 3: Update device with consolidated updates (only one update call)
    console.log("Updating device with:", updates);
    const { error: updateError } = await supabase
      .from("devices")
      .update(updates)
      .eq("device_id", device_id);

    if (updateError) {
      console.error("Device update error:", updateError);
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
          console.warn(
            `No matching ${channel_type} channel found for ${channelType}_${channel_number}`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error updating device state:", error);
  }
}
