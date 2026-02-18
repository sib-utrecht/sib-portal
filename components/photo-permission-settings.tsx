"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Camera, Eye, EyeOff, X } from "lucide-react"
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

  type PrefKey = "noAlcohol" | "noAudio" | "notProminently" | "noSocialMedia" | "noTiktok"
  const chipOptions: Array<{ key: PrefKey; label: string }> = [
    { key: "noAlcohol", label: "No alcohol" },
    { key: "noAudio", label: "No audio" },
    { key: "notProminently", label: "Not prominently" },
    { key: "noSocialMedia", label: "No social media" },
    { key: "noTiktok", label: "No TikTok" },
  ]
  const enabledChips = chipOptions.filter(({ key }) => prefs[key])
  const disabledChips = chipOptions.filter(({ key }) => !prefs[key])
  const [pickerOpen, setPickerOpen] = useState(false)

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
        <div className="flex flex-wrap gap-2">
          {enabledChips.length === 0 ? (
            <span className="text-sm text-muted-foreground">No additional preferences selected</span>
          ) : (
            enabledChips.map(({ key, label }) => (
              <div
                key={key}
                className="inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-sm select-none bg-primary text-primary-foreground shadow-xs"
                aria-label={`${label} (enabled)`}
              >
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, [key]: false }))}
                  title={`Remove ${label}`}
                  aria-label={`Remove ${label}`}
                  className="ml-0.5 inline-grid place-items-center cursor-pointer rounded-full p-0.5 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="photo-prefs-other">Other</Label>
          <div className="relative">
            <Input
              id="photo-prefs-other"
              placeholder="Type a note or pick more preferences"
              value={prefs.other}
              onFocus={() => setPickerOpen(true)}
              onClick={() => setPickerOpen(true)}
              onBlur={() => setTimeout(() => setPickerOpen(false), 120)}
              onChange={(e) => setPrefs((p) => ({ ...p, other: e.target.value }))}
              aria-expanded={pickerOpen}
              aria-controls="photo-prefs-suggestions"
              role="combobox"
            />
            {pickerOpen && disabledChips.length > 0 && (
              <div
                id="photo-prefs-suggestions"
                role="listbox"
                className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-md"
              >
                {disabledChips.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setPrefs((p) => ({ ...p, [key]: true }))
                      setPickerOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-accent"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
