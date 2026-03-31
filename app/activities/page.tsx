import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "react-router-dom";
import { MapPin, Users, Plus, ChevronRight } from "lucide-react";

function formatDateShort(ts: number) {
  return new Date(ts).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayNum(ts: number) {
  return new Date(ts).toLocaleDateString("nl-NL", { day: "numeric" });
}

function formatMonthAbbr(ts: number) {
  return new Date(ts).toLocaleDateString("nl-NL", { month: "short" });
}

function ActivitiesContent() {
  const activities = useQuery(api.activities.getActivities);
  const { isAdmin } = useAuth();
  const loading = activities === undefined;

  const now = Date.now();
  const upcoming = activities?.filter((a) => a.endTime >= now) ?? [];
  const past = activities?.filter((a) => a.endTime < now) ?? [];

  return (
    <div className="min-h-screen portal-bg">
      <header className="portal-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold portal-title">Activities</h1>
            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  asChild
                  size="sm"
                  className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full shadow-sm shadow-[#21526f]/20"
                >
                  <Link to="/activities/new">
                    <Plus className="h-4 w-4 mr-1" />
                    New activity
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm" className="border-[#21526f]/30 hover:bg-[#eaf3f7] hover:text-[#21526f]">
                <Link to="/">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {loading ? (
          <div>
            <Skeleton className="h-5 w-28 mb-6 rounded-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white/60 shadow-sm">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-sm font-semibold text-[#21526f] mb-5 flex items-center gap-2 uppercase tracking-widest">
                <span className="inline-block w-2 h-2 rounded-full bg-[#21526f]" />
                Upcoming
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-gray-400 text-sm">No upcoming activities.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {upcoming.map((activity) => (
                    <ActivityTile key={activity._id} activity={activity} />
                  ))}
                </div>
              )}
            </section>

            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-5 flex items-center gap-2 uppercase tracking-widest">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
                  Past
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[...past].reverse().map((activity) => (
                    <ActivityTile key={activity._id} activity={activity} past />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ActivityTile({
  activity,
  past = false,
}: {
  activity: {
    _id: string;
    title: string;
    startTime: number;
    endTime: number;
    location?: string;
    allowSignup: boolean;
    maxParticipants?: number;
    promotionalImage?: string;
  };
  past?: boolean;
}) {
  return (
    <Link to={`/activities/${activity._id}`} className="block group">
      <div
        className={`rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-300
          ${past
            ? "opacity-55 hover:opacity-75 hover:shadow-md"
            : "hover:-translate-y-1 hover:shadow-xl hover:shadow-[#21526f]/12 ring-1 ring-[#21526f]/10 hover:ring-[#21526f]/25"
          }`}
      >
        {/* Image area */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#c8e3ef] to-[#a3cfe0]">
          {activity.promotionalImage ? (
            <img
              src={activity.promotionalImage}
              alt=""
              className={`w-full h-full object-cover transition-transform duration-500 ${past ? "" : "group-hover:scale-105"}`}
            />
          ) : (
            /* Placeholder pattern when no image */
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-[#21526f]/15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
          )}

          {/* Gradient overlay at bottom of image */}
          {!past && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          )}

          {/* Date badge */}
          <div className={`absolute bottom-3 left-3 flex items-center gap-2 ${past ? "opacity-70" : ""}`}>
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-2.5 py-1.5 shadow-sm flex items-center gap-2">
              <div className="text-center leading-none">
                <div className="text-[11px] font-semibold text-[#21526f]/70 uppercase tracking-wide">
                  {formatMonthAbbr(activity.startTime)}
                </div>
                <div className="text-lg font-bold text-[#21526f] leading-tight">
                  {formatDayNum(activity.startTime)}
                </div>
              </div>
              <div className="text-[11px] text-gray-500 font-medium leading-snug border-l border-gray-200 pl-2">
                <div>{formatDateShort(activity.startTime).split(",")[0]}</div>
                <div>{formatTime(activity.startTime)}</div>
              </div>
            </div>
          </div>

          {/* Signup badge */}
          {activity.allowSignup && !past && (
            <div className="absolute top-3 right-3">
              <span className="bg-[#21526f] text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full shadow-sm">
                Sign-up
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-sm font-semibold leading-snug line-clamp-2 flex-1
              ${past ? "text-gray-500" : "text-gray-900 group-hover:text-[#21526f] transition-colors duration-200"}`}>
              {activity.title}
            </h3>
            {!past && (
              <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-[#21526f]/25 group-hover:text-[#21526f]/60 transition-colors duration-200" />
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0 text-[#6fb0cd]" />
                {activity.location}
              </span>
            )}
            {activity.allowSignup && activity.maxParticipants !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 shrink-0 text-[#6fb0cd]" />
                max {activity.maxParticipants}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ActivitiesPage() {
  return (
    <RequireAuth>
      <ActivitiesContent />
    </RequireAuth>
  );
}
