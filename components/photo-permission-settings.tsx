"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Camera, Eye, EyeOff } from "lucide-react"
import { useAuth } from "../contexts/auth-context"
import type { PhotoPermission } from "../types/user"
import { useState } from "react"

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

  const [prefs, setPrefs] = useState({
    noAlcohol: false,
    noAudio: false,
    notProminently: false,
    noSocialMedia: false,
    noTiktok: false,
    other: "",
  })

  if (!user) return null

  const handlePermissionChange = (value: string) => {
    updatePhotoPermission(value as PhotoPermission)
  }

  const currentOption = permissionOptions.find((option) => option.value === user.photoPermission)

  return (
    <div className="space-y-8">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current setting:</span>
          {currentOption && <Badge className={currentOption.color}>{currentOption.label}</Badge>}
        </div>

        <RadioGroup value={user.photoPermission} onValueChange={handlePermissionChange} className="space-y-0">
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

        <div className="space-y-3">
          <h4 className="text-base font-semibold">Additional preferences</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.noAlcohol}
                onChange={(e) => setPrefs((p) => ({ ...p, noAlcohol: e.target.checked }))}
              />
              <span>No alcohol</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.notProminently}
                onChange={(e) => setPrefs((p) => ({ ...p, notProminently: e.target.checked }))}
              />
              <span>Not prominently</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.noAudio}
                onChange={(e) => setPrefs((p) => ({ ...p, noAudio: e.target.checked }))}
              />
              <span>No audio</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.noSocialMedia}
                onChange={(e) => setPrefs((p) => ({ ...p, noSocialMedia: e.target.checked }))}
              />
              <span>No social media</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.noTiktok}
                onChange={(e) => setPrefs((p) => ({ ...p, noTiktok: e.target.checked }))}
              />
              <span>No TikTok</span>
            </label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="photo-prefs-other">Other</Label>
            <Input
              id="photo-prefs-other"
              placeholder="Add any additional note"
              value={prefs.other}
              onChange={(e) => setPrefs((p) => ({ ...p, other: e.target.value }))}
            />
          </div>
        </div>
       {/* </CardContent>
     </Card> */}
    </div>
  )
}
