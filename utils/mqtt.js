// MQTT utility functions
const mqttClient = null

export const initializeMQTT = () => {
  // Initialize MQTT client if needed
  console.log("MQTT client initialization...")
}

export const publishMQTTMessage = async (deviceId, message) => {
  try {
    // Use device_id as the topic name
    const topic = deviceId.toString()

    console.log("📤 Publishing MQTT message:", { topic, message })
    console.log("🎯 Publishing to device topic:", topic)

    // Try direct MQTT first (if client is available)
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(topic, JSON.stringify(message))
      console.log("✅ MQTT message published directly")
      return { success: true }
    }

    // Fallback to API route if MQTT client not available
    console.log("MQTT client not connected, using API fallback")
    const response = await fetch("/api/mqtt/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, message }),
    })

    console.log("📡 API Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ API Error response:", errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    // Check if response has content
    const responseText = await response.text()
    console.log("📡 Raw API Response:", responseText)

    if (!responseText) {
      console.warn("⚠️ Empty response from API")
      return { success: true, message: "Empty response but request succeeded" }
    }

    try {
      const result = JSON.parse(responseText)
      console.log("✅ MQTT message published via API:", result)
      return result
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError)
      console.error("❌ Response text that failed to parse:", responseText)
      throw new Error(`Invalid JSON response: ${responseText}`)
    }
  } catch (error) {
    console.error("❌ Error publishing MQTT message:", error)
    throw error
  }
}

export const subscribeMQTTTopic = (topic, callback) => {
  // Subscribe to MQTT topic
  console.log("📥 Subscribing to MQTT topic:", topic)

  if (mqttClient && mqttClient.connected) {
    mqttClient.subscribe(topic)
    mqttClient.on("message", (receivedTopic, message) => {
      if (receivedTopic === topic) {
        callback(JSON.parse(message.toString()))
      }
    })
  }
}

