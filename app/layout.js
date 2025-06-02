import { Inter } from "next/font/google"
import "./globals.css"
import MQTTProcessor from "@/components/MQTTProcessor"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "VendorFlow",
  description: "Manage your IoT devices with MQTT integration",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <MQTTProcessor />
      </body>
    </html>
  )
}
