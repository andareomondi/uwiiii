import mqtt from "mqtt";

let mqttClient = null;
const brokerUrl = "mqtt://localhost";
if (!mqttClient) {
  try {
    mqttClient = mqtt.connect(brokerUrl, {
      clientId: `vendorflow_mqtt`,
      clean: true,
      connectTimeout: 4000,
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      reconnectPeriod: 0,
    });
    mqttClient.on("connect", () => {
      const topics = ["RELAY_CONTROLLER/+/", "vending/+/"];
      mqttClient.subscribe(topics);
    });
  } catch (error) {
    console.log("an error occured during client creation");
  }
} else {
  console.log("client already connected");
}
if (mqttClient) {
  mqttClient.on("message", (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      console.log("Received MQTT message:", { topic, payload });

      fetch("/api/mqtt/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, payload, device_id: payload.device_id }),
      });
    } catch (error) {
      console.error("Error processing MQTT message:", error);
    }
  });
}

export const publishMQTTMessage = async (topic, message) => {
  try {
    const client = mqttClient;
    if (client && client.connected) {
      // Publish directly to MQTT broker
      client.publish(topic, JSON.stringify(message), { qos: 1 });
      console.log("Published MQTT message:", { topic, message });
      return { success: true };
    } else {
      // Fallback to API route if MQTT client not available
      console.log("MQTT client not connected, using API fallback");
      const response = await fetch("api/mqtt/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, message }),
      });
      return response.json();
    }
  } catch (error) {
    console.error("Error publishing MQTT message:", error);

    // Fallback to API route in case of errors
    try {
      const response = await fetch("/api/mqtt/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, message }),
      });
      return response.json();
    } catch (fallbackError) {
      console.error("API fallback also failed:", fallbackError);
      throw error;
    }
  }
};
