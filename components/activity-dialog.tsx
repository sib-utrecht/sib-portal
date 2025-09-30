"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, Euro, Clock } from 'lucide-react'
import { getActivityName, getActivityDescription, getActivityStartDate, getActivityEndDate, getActivityImage } from "../utils/activity-helpers"
import type { Activity } from "../types/activity"

interface ActivityDialogProps {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivityDialog({ activity, open, onOpenChange }: ActivityDialogProps) {
  if (!activity) return null

  const activityName = getActivityName(activity)
  const activityDescription = getActivityDescription(activity)
  const startDate = getActivityStartDate(activity)
  const endDate = getActivityEndDate(activity)
  const imageUrl = getActivityImage(activity)

  const formatDate = (dateString: string) => {
    if (!dateString) return "TBD"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "Invalid date"
    }
  }

  const formatPrice = (price: number) => {
    return price === 0 ? "Free" : `€${price.toFixed(2)}`
  }

  const handleSignup = () => {
    // In a real app, this would handle the signup process
    alert(`Signing up for: ${activityName}`)
  }

  const isSignupAvailable = activity.is_signup_open && !activity.is_full

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{activityName}</DialogTitle>
          <DialogDescription className="text-base">
            Organized by {activity.organizer || "Unknown organizer"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Activity Image */}
          {imageUrl && (
            <div className="w-full h-48 rounded-lg overflow-hidden">
              <img
                src={imageUrl || "/placeholder.svg"}
                alt={activityName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=200&width=400&text=Activity+Image"
                }}
              />
            </div>
          )}

          {/* Activity Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-gray-600">{formatDate(startDate)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">End Date</p>
                  <p className="text-sm text-gray-600">{formatDate(endDate)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-gray-600">{activity.location || "TBD"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Participants</p>
                  <p className="text-sm text-gray-600">
                    {activity.current_participants || 0}
                    {activity.max_participants && ` / ${activity.max_participants}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Price</p>
                  <p className="text-sm text-gray-600">{formatPrice(activity.price || 0)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Category</p>
                <Badge variant="secondary">{activity.category || "General"}</Badge>
              </div>
            </div>
          </div>

          {/* Signup Information */}
          {activity.signup_start && activity.signup_end && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Signup Period</h4>
              <p className="text-sm text-gray-600">From: {formatDate(activity.signup_start)}</p>
              <p className="text-sm text-gray-600">Until: {formatDate(activity.signup_end)}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{activityDescription}</p>
          </div>

          {/* Status Badges */}
          <div className="flex gap-2 flex-wrap">
            {activity.is_signup_open ? (
              <Badge className="bg-green-100 text-green-800">Signup Open</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">Signup Closed</Badge>
            )}
            {activity.is_full && <Badge className="bg-red-100 text-red-800">Full</Badge>}
            {(activity.price || 0) === 0 && <Badge className="bg-accent text-primary">Free Event</Badge>}
          </div>

          {/* Signup Button */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSignup} disabled={!isSignupAvailable} className="flex-1">
              {activity.is_full ? "Event Full" : !activity.is_signup_open ? "Signup Closed" : "Sign Up"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
