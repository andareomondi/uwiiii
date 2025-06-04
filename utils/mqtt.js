// This function publishes to the route /api/mqtt/publish but this isn't what is going to apply to the actual real life scenario. We have to refactor this code to actually publish to the broker url that we have been given by the client.
// Same to the subscribeToMQTTMessages function

export const publishMQTTMessage = async (topic, message) => {
  try {
    const response = await fetch("/api/mqtt/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic, message }),
    })
    return response.json()
  } catch (error) {
    console.error("Error publishing MQTT message:", error)
    throw error
  }
}

export const subscribeToMQTTMessages = (callback) => {
  // This would typically use a WebSocket connection or Server-Sent Events
  // For now, we'll poll the database for new messages
  const interval = setInterval(async () => {
    try {
      const response = await fetch("/api/mqtt/messages")
      const messages = await response.json()
      callback(messages)
    } catch (error) {
      console.error("Error fetching MQTT messages:", error)
    }
  }, 1000)

  return () => clearInterval(interval)
}
