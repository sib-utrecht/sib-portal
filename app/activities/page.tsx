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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-4xl font-bold text-gray-900 underline decoration-4">Activities</h1>
            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  asChild
                  size="sm"
                  className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full"
                >
                  <Link to="/activities/new">
                    <Plus className="h-4 w-4 mr-1" />
                    New activity
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
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
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upcoming</h2>
              {upcoming.length === 0 ? (
                <p className="text-gray-500">No upcoming activities.</p>
              ) : (
                <div className="space-y-4">
                  {upcoming.map((activity) => (
                    <ActivityCard key={activity._id} activity={activity} />
                  ))}
                </div>
              )}
            </section>

            {past.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-gray-500 mb-4">Past</h2>
                <div className="space-y-4">
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
    location: string;
    allowSignup: boolean;
    maxParticipants?: number;
    promotionalImage?: string;
  };
  past?: boolean;
}) {
  return (
    <Link to={`/activities/${activity._id}`}>
      <Card
        className={`flex gap-4 p-0 overflow-hidden border-2 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          past ? "border-gray-200 opacity-70" : "border-[#21526f]"
        }`}
      >
        {activity.promotionalImage && (
          <div className="w-40 shrink-0 bg-muted flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activity.promotionalImage} alt="" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex-1 p-5 space-y-2">
          <h3 className="text-xl font-bold text-gray-900">{activity.title}</h3>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 shrink-0" />
              {formatDate(activity.startTime)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 shrink-0" />
              {activity.location}
            </span>
            {activity.allowSignup && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 shrink-0" />
                {activity.maxParticipants !== undefined
                  ? `Sign-up · max ${activity.maxParticipants}`
                  : "Sign-up open"}
              </span>
            )}
          </div>
        </div>
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
