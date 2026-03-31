import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Users, Plus } from "lucide-react";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-3xl" />
            ))}
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold text-[#21526f] mb-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#21526f]" />
                Upcoming
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-gray-400 text-sm">No upcoming activities.</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((activity) => (
                    <ActivityCard key={activity._id} activity={activity} />
                  ))}
                </div>
              )}
            </section>

            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
                  Past
                </h2>
                <div className="space-y-3">
                  {[...past].reverse().map((activity) => (
                    <ActivityCard key={activity._id} activity={activity} past />
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

function ActivityCard({
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
    <Link to={`/activities/${activity._id}`}>
      <Card
        className={`flex gap-0 p-0 overflow-hidden rounded-2xl shadow-sm transition-all cursor-pointer group
          ${past
            ? "border border-gray-200 opacity-60 hover:opacity-80 hover:shadow-md"
            : "border-0 ring-1 ring-[#21526f]/20 hover:ring-[#21526f]/40 hover:shadow-lg hover:shadow-[#21526f]/8 hover:-translate-y-0.5"
          }`}
      >
        {/* Colored left accent bar */}
        <div className={`w-1 shrink-0 ${past ? "bg-gray-200" : "bg-gradient-to-b from-[#21526f] to-[#6fb0cd]"}`} />

        {activity.promotionalImage && (
          <div className="w-32 shrink-0 bg-[#eaf3f7] flex items-center justify-center overflow-hidden">
            <img src={activity.promotionalImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 p-4 space-y-1.5">
          <h3 className={`text-base font-semibold leading-snug ${past ? "text-gray-500" : "text-gray-900 group-hover:text-[#21526f] transition-colors"}`}>
            {activity.title}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[#6fb0cd]" />
              {formatDate(activity.startTime)}
            </span>
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6fb0cd]" />
                {activity.location}
              </span>
            )}
            {activity.allowSignup && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 shrink-0 text-[#6fb0cd]" />
                {activity.maxParticipants !== undefined
                  ? `Sign-up · max ${activity.maxParticipants}`
                  : "Sign-up open"}
              </span>
            )}
          </div>
        </div>

        {!past && (
          <div className="flex items-center pr-4 text-[#21526f]/30 group-hover:text-[#21526f]/60 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </Card>
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
