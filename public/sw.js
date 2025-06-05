const CACHE_NAME = "vendorflow-v1"
const urlsToCache = [
  "/",
  "/dashboard",
  "/shops",
  "/smart-home",
  "/marketplace",
  "/analytics",
  "/offline",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/icon-192x192.png",
  "/icon-512x512.png",
]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.destination === "document") {
          return caches.match("/offline")
        }
      }),
  )
})

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "device-action") {
    event.waitUntil(syncOfflineActions())
  }
})

// Push notifications
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification from VendorFlow",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View Details",
        icon: "/icon-192x192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icon-192x192.png",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification("VendorFlow", options))
})

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/dashboard"))
  }
})

async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB or localStorage
    const actions = JSON.parse(localStorage.getItem("vendorflow-offline-actions") || "[]")

    for (const action of actions) {
      // Send SMS or API call to device
      await sendDeviceCommand(action)
    }

    // Clear offline actions after successful sync
    localStorage.removeItem("vendorflow-offline-actions")
  } catch (error) {
    console.error("Error syncing offline actions:", error)
  }
}

async function sendDeviceCommand(action) {
  // Implement SMS/API call to device with SIM card
  // This would integrate with your SMS service or device API
  console.log("Sending device command:", action)
}
