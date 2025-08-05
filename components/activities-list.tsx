"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, MapPin, Users, Euro, ActivityIcon } from 'lucide-react'
import { useActivities } from "../hooks/use-activities"
import { ActivityDialog } from "./activity-dialog"
import { getActivityName, getActivityDescription, getActivityStartDate } from "../utils/activity-helpers"
import type { Activity } from "../types/activity"

export function ActivitiesList() {
  const { activities, loading, error } = useActivities()
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity)
    setDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "TBD"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
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

  // Ensure activities is always an array
  const safeActivities = Array.isArray(activities) ? activities : []

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Upcoming Activities
          </CardTitle>
          <CardDescription>Loading activities...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Upcoming Activities
          </CardTitle>
          <CardDescription className="text-red-600">Failed to load activities: {error}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Unable to fetch activities from the server. Please try again later.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Upcoming Activities
          </CardTitle>
          <CardDescription>Discover and join activities organized by SIB Utrecht</CardDescription>
        </CardHeader>
        <CardContent>
          {safeActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No activities available at the moment.</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {safeActivities.slice(0, 10).map((activity) => {
                const activityName = getActivityName(activity)
                const activityDescription = getActivityDescription(activity)
                const startDate = getActivityStartDate(activity)

                return (
                  <div
                    key={activity.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleActivityClick(activity)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm line-clamp-1">{activityName}</h4>
                      <Badge variant={activity.is_signup_open ? "default" : "secondary"} className="ml-2 shrink-0">
                        {activity.is_signup_open ? "Open" : "Closed"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(startDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{activity.location || "TBD"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {activity.current_participants || 0}
                        {activity.max_participants && `/${activity.max_participants}`}
                      </div>
                      <div className="flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {formatPrice(activity.price || 0)}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2">{activityDescription}</p>

                    <div className="flex justify-between items-center mt-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.category || "General"}
                      </Badge>
                      {activity.is_full && <Badge className="bg-red-100 text-red-800 text-xs">Full</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ActivityDialog activity={selectedActivity} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
