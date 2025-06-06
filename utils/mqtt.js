// Real MQTT integration using the mqtt package
// Install with: npm install mqtt

let mqttClient = null

export const initializeMQTT = async () => {
  if (typeof window !== "undefined" && !mqttClient) {
    try {
      // Use dynamic import instead of require
      const mqtt = await import("mqtt/dist/mqtt.min.js")

      // Replace with your actual MQTT broker URL
      const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL 

      mqttClient = mqtt.connect(brokerUrl, {
        clientId: `vendorflow_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        connectTimeout: 4000,
        username: process.env.NEXT_PUBLIC_MQTT_USERNAME, 
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD, 
        reconnectPeriod: 1000,
      })

      mqttClient.on("connect", () => {
        console.log("Connected to MQTT broker")
      })

      mqttClient.on("error", (error) => {
        console.error("MQTT connection error:", error)
      })

      mqttClient.on("message", (topic, message) => {
        try {
          const payload = JSON.parse(message.toString())
          console.log("Received MQTT message:", { topic, payload })

          // Send to our API for processing
          fetch("/api/mqtt/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, payload, device_id: payload.device_id }),
          })
        } catch (error) {
          console.error("Error processing MQTT message:", error)
        }
      })
    } catch (error) {
      console.error("Failed to load MQTT client:", error)
    }
  }

  return mqttClient
}

export const publishMQTTMessage = async (topic, message) => {
  try {
    // Make sure MQTT client is initialized
    const client = await initializeMQTT()

    if (client && client.connected) {
      // Publish directly to MQTT broker
      client.publish(topic, JSON.stringify(message), { qos: 1 })
      console.log("Published MQTT message:", { topic, message })
      return { success: true }
    } else {
      // Fallback to API route if MQTT client not available
      console.log("MQTT client not connected, using API fallback")
      const response = await fetch("/api/mqtt/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, message }),
      })
      return response.json()
    }
  } catch (error) {
    console.error("Error publishing MQTT message:", error)

    // Fallback to API route in case of errors
    try {
      const response = await fetch("/api/mqtt/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, message }),
      })
      return response.json()
    } catch (fallbackError) {
      console.error("API fallback also failed:", fallbackError)
      throw error
    }
  }
}

export const subscribeToMQTTMessages = (topics, callback) => {
  const client = initializeMQTT()

  if (client) {
    client.subscribe(topics, (error) => {
      if (error) {
        console.error("MQTT subscription error:", error)
      } else {
        console.log("Subscribed to MQTT topics:", topics)
      }
    })

    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString())
        callback({ topic, payload })
      } catch (error) {
        console.error("Error parsing MQTT message:", error)
      }
    })

    return () => {
      client.unsubscribe(topics)
    }
  }

  // Fallback to polling if MQTT not available
  const interval = setInterval(async () => {
    try {
      const response = await fetch("/api/mqtt/messages")
      const messages = await response.json()
      callback(messages)
    } catch (error) {
      console.error("Error fetching MQTT messages:", error)
    }
  }, 5000)

  return () => clearInterval(interval)
}
