"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ToastTest() {
  const { toast } = useToast()

  const testSuccessToast = () => {
    toast({
      title: "Success!",
      description: "Device action completed successfully",
      variant: "success",
    })
  }

  const testErrorToast = () => {
    toast({
      title: "Error",
      description: "Failed to control device. Please try again.",
      variant: "destructive",
    })
  }

  const testDefaultToast = () => {
    toast({
      title: "Information",
      description: "Device status updated",
      variant: "default",
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test Toast Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={testSuccessToast} className="w-full" variant="default">
          Test Success Toast
        </Button>
        <Button onClick={testErrorToast} className="w-full" variant="destructive">
          Test Error Toast
        </Button>
        <Button onClick={testDefaultToast} className="w-full" variant="outline">
          Test Default Toast
        </Button>
      </CardContent>
    </Card>
  )
}
