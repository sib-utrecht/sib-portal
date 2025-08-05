"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Camera, Eye, EyeOff } from "lucide-react"
import { useAuth } from "../contexts/auth-context"
import type { PhotoPermission } from "../types/user"

const permissionOptions = [
  {
    value: "internal+external" as PhotoPermission,
    label: "Internal + External",
    description: "Photos can be used for both internal communications and external marketing",
    icon: Camera,
    color: "bg-green-100 text-green-800",
  },
  {
    value: "internal" as PhotoPermission,
    label: "Internal Only",
    description: "Photos can only be used for internal communications",
    icon: Eye,
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "nowhere" as PhotoPermission,
    label: "No Usage",
    description: "Photos should not be used anywhere",
    icon: EyeOff,
    color: "bg-red-100 text-red-800",
  },
]

export function PhotoPermissionSettings() {
  const { user, updatePhotoPermission } = useAuth()

  if (!user) return null

  const handlePermissionChange = (value: string) => {
    updatePhotoPermission(value as PhotoPermission)
  }

  const currentOption = permissionOptions.find((option) => option.value === user.photoPermission)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photo Permissions
        </CardTitle>
        <CardDescription>Control how your photos can be used by the organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current setting:</span>
          {currentOption && <Badge className={currentOption.color}>{currentOption.label}</Badge>}
        </div>

        <RadioGroup value={user.photoPermission} onValueChange={handlePermissionChange} className="space-y-4">
          {permissionOptions.map((option) => {
            const Icon = option.icon
            return (
              <div
                key={option.value}
                className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handlePermissionChange(option.value)}
              >
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={option.value} className="flex items-center gap-2 font-medium cursor-pointer">
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
              </div>
            )
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
