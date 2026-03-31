"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Users, Euro, ActivityIcon } from "lucide-react";
import { useActivities } from "../hooks/use-activities";
import { ActivityDialog } from "./activity-dialog";
import {
  getActivityName,
  getActivityDescription,
  getActivityStartDate,
} from "../utils/activity-helpers";
import type { Activity } from "../types/activity";

/**
 * Formats an ISO 8601 date string into a short locale string showing month,
 * day, and time (e.g. "Mar 15, 14:30").
 *
 * @param dateString - ISO 8601 date string to format.
 * @returns Formatted date string, `"TBD"` for empty input, or `"Invalid date"` on parse error.
 */
function formatDate(dateString: string) {
  if (!dateString) return "TBD";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "Invalid date";
  }
}

/**
 * Formats a euro price for display.
 *
 * @param price - Price in euros; `0` is treated as a free event.
 * @returns `"Free"` for zero-price events, or a formatted euro string (e.g. `"€5.00"`).
 */
function formatPrice(price: number | undefined) {
  if (price === undefined) return "—";
  return price === 0 ? "Free" : `€${price.toFixed(2)}`;
}

/**
 * Scrollable card listing upcoming SIB-Utrecht activities fetched from the
 * external API.  Each activity row is clickable and opens an {@link ActivityDialog}
 * with full details.  Skeleton placeholders are shown while loading, and an
 * error message is displayed if the fetch fails.
 */
export function ActivitiesList() {
  const { activities, loading, error } = useActivities();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setDialogOpen(true);
  };

  const cardDescription = loading
    ? "Loading activities..."
    : error
      ? "Failed to load activities"
      : `Discover and join activities organized by SIB Utrecht (${activities.length} activities)`;

  return (
    <>
      <Card className="border-t-4 border-t-[#21526f] shadow-sm shadow-[#21526f]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#21526f]">
            <div className="p-1.5 rounded-lg bg-[#eaf3f7]">
              <ActivityIcon className="h-4 w-4 text-[#21526f]" />
            </div>
            Upcoming Activities
          </CardTitle>
          <CardDescription className={error ? "text-red-600" : undefined}>
            {cardDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl border border-[#21526f]/10">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-gray-400">
              Unable to fetch activities from the server. Please try again later.
            </p>
          ) : activities.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">No activities available at the moment.</p>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => {
                const activityName = getActivityName(activity);
                const activityDescription = getActivityDescription(activity);
                const startDate = getActivityStartDate(activity);
                const price = activity.price;

                return (
                  <button
                    key={activity.id}
                    className="w-full text-left rounded-xl border border-[#21526f]/10 hover:border-[#21526f]/30 hover:bg-[#eaf3f7]/40 cursor-pointer transition-all group overflow-hidden flex"
                    onClick={() => handleActivityClick(activity)}
                  >
                    {/* Colored left bar */}
                    <div className={`w-0.5 shrink-0 ${activity.is_signup_open ? "bg-[#21526f]" : "bg-gray-200"}`} />

                    <div className="flex-1 p-3">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-sm line-clamp-1 flex-1 mr-2 text-gray-800 group-hover:text-[#21526f] transition-colors">
                          {activityName}
                        </h4>
                        {activity.is_signup_open ? (
                          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[#eaf3f7] text-[#21526f]">Open</span>
                        ) : (
                          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-500">Closed</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-[#6fb0cd]" />
                          {formatDate(startDate)}
                        </span>
                        {activity.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#6fb0cd]" />
                            <span className="truncate max-w-[80px]">{activity.location}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-[#6fb0cd]" />
                          {activity.current_participants ?? 0}
                          {activity.max_participants && `/${activity.max_participants}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro className="h-3 w-3 text-[#6fb0cd]" />
                          {formatPrice(price)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                          {activity.category ?? "General"}
                        </span>
                        <div className="flex gap-1">
                          {activity.is_full && (
                            <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-red-100 text-red-600">Full</span>
                          )}
                          {price === 0 && (
                            <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-[#eaf3f7] text-[#21526f]">Free</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ActivityDialog activity={selectedActivity} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
