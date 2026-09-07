import { Navigate } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ActivityDescription } from "@/components/activity-description";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { activityDateTimeZone } from "@/utils/activity-date";
import { isActivityDeregistrationOpen, isActivitySignupOpen } from "@/utils/activity-registration";
import { ActivityHeader } from "./components/activity-header";
import { ActivitySignupCard } from "./components/activity-signup-card";
import { ExternalSignupCard } from "./components/external-signup-card";
import { ParticipantAdminCard } from "./components/participant-admin-card";

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    timeZone: activityDateTimeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityDetailContent({ slug }: { slug: string }) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const activity = useQuery(api.activities.getActivity, { slug });
  const status = useQuery(
    api.activityBookings.getActivityStatus,
    isAuthenticated && activity?._id ? { activityId: activity._id } : "skip",
  );

  if (activity === undefined)
    return (
      <div className="w-full space-y-4">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  if (activity === null) return <p className="text-white/80">Activity not found.</p>;
  if (activity.slug !== slug) return <Navigate to={`/activities/${activity.slug}`} replace />;

  const now = Date.now();
  const signupOpen = isActivitySignupOpen(activity, now);
  const loginUrl = `/login?redirect_uri=${encodeURIComponent(`/activities/${activity.slug}`)}`;

  return (
    <div className="w-full space-y-8">
      <ActivityHeader activity={activity} />
      <Card className="max-w-none rounded-2xl p-6 shadow-sm shadow-[#21526f]/5">
        <ActivityDescription>{activity.description}</ActivityDescription>
      </Card>
      {activity.externalSignupUrl && (
        <ExternalSignupCard
          url={activity.externalSignupUrl}
          signupOpen={signupOpen}
          authLoading={authLoading}
          authenticated={isAuthenticated}
          loginUrl={loginUrl}
        />
      )}
      {activity.allowSignup && !activity.externalSignupUrl && (
        <ActivitySignupCard
          activityId={activity._id}
          status={status}
          authLoading={authLoading}
          authenticated={isAuthenticated}
          registrationOpen={signupOpen}
          deregistrationOpen={isActivityDeregistrationOpen(activity.endTime, now)}
          maxParticipants={activity.maxParticipants}
          registrationDeadline={activity.registrationDeadline}
          loginUrl={loginUrl}
          formatDate={formatDate}
        />
      )}
      <ParticipantAdminCard
        activityId={activity._id}
        registrationDeadline={activity.registrationDeadline}
        maxParticipants={activity.maxParticipants}
        externallyManaged={Boolean(activity.externalSignupUrl)}
        canHaveManagedSignups={activity.allowSignup || activity.legacySignupMethod === "api"}
        isAdmin={Boolean(status?.isAdmin)}
        formatActivityDate={formatDate}
      />
    </div>
  );
}
