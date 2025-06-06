"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Copy, Phone } from "lucide-react"
import { useOffline } from "@/hooks/use-offline"
import { useToast } from "@/hooks/use-toast"

interface SMSInstructionsProps {
  device: any
  action: string
  data?: any
}

export function SMSInstructions({ device, action, data }: SMSInstructionsProps) {
  const { isOnline } = useOffline()
  const { toast } = useToast()

  if (isOnline || !device.phone_number) {
    return null
  }

  const getSMSCommand = () => {
    switch (action) {
      case "dispense":
        return `DISPENSE ${data?.amount || 250}`
      case "toggle_on":
        return `ON ${data?.channelNumber || 1}`
      case "toggle_off":
        return `OFF ${data?.channelNumber || 1}`
      case "start_pump":
        return "START"
      case "stop_pump":
        return "STOP"
      case "status":
        return "STATUS"
      default:
        return "HELP"
    }
  }

  const smsCommand = getSMSCommand()
  const phoneNumber = device.phone_number

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "SMS command copied to clipboard",
      variant: "success",
    })
  }

  const openSMSApp = () => {
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(smsCommand)}`
    window.open(smsUrl, "_blank")
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-600" />
          <CardTitle className="text-sm text-orange-800 dark:text-orange-200">Device Offline - Use SMS</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number:</span>
            <Badge variant="outline" className="font-mono">
              {phoneNumber}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SMS Command:</span>
            <Badge variant="secondary" className="font-mono">
              {smsCommand}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={openSMSApp} className="flex-1 bg-orange-600 hover:bg-orange-700">
            <Phone className="w-4 h-4 mr-2" />
            Send SMS
          </Button>
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(smsCommand)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 p-2 rounded">
          <strong>Instructions:</strong> Send the SMS command to the device's phone number. The device will respond with
          a confirmation message.
        </div>
      </CardContent>
    </Card>
  )
}
