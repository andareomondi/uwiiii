import { NextResponse } from "next/server";
import mqtt from "mqtt";

export async function POST(request) {
  let client = null;

  try {
    console.log("🔄 MQTT API route called");

    const body = await request.json();
    console.log("📥 Request body:", body);

    const { topic, message } = body;

    if (!topic || !message) {
      console.error("❌ Missing topic or message");
      return NextResponse.json(
        { error: "Missing topic or message" },
        { status: 400 }
      );
    }

    // Connect to Mosquitto broker with fixed client ID
    const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
    const fixedClientId = "nextjs_iot_dashboard"; // Fixed client ID to prevent double connections

    console.log("🔗 Connecting to MQTT broker:", brokerUrl);
    console.log("🆔 Using client ID:", fixedClientId);

    client = mqtt.connect(brokerUrl, {
      clientId: fixedClientId,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 0,
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("MQTT connection timeout"));
      }, 5000);

      client.on("connect", () => {
        console.log("✅ Connected to MQTT broker");
        clearTimeout(timeout);
        resolve();
      });

      client.on("error", (error) => {
        console.error("❌ MQTT connection error:", error);
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Remove timestamp from message before publishing
    const { timestamp, ...messageWithoutTimestamp } = message;
    const messageString = JSON.stringify(messageWithoutTimestamp);

    console.log(`📤 Publishing to topic "${topic}":`, messageString);

    await new Promise((resolve, reject) => {
      client.publish(topic, messageString, { qos: 1 }, (error) => {
        if (error) {
          console.error("❌ MQTT publish error:", error);
          reject(error);
        } else {
          console.log("✅ MQTT message published successfully");
          resolve();
        }
      });
    });

    // Close connection
    client.end();

    const response = {
      success: true,
      message: "MQTT message published successfully",
      topic,
      brokerUrl,
      clientId: fixedClientId,
    };

    console.log("✅ Sending response:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error in MQTT API route:", error);

    // Clean up connection on error
    if (client) {
      try {
        client.end(true); // Force close
      } catch (closeError) {
        console.error("❌ Error closing MQTT client:", closeError);
      }
    }

    return NextResponse.json(
      {
        error: "Failed to publish MQTT message",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
