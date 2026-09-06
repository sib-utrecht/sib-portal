import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Users, Pencil, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ActivityDescription } from "@/components/activity-description";
import { HeaderAuthControls } from "@/components/header-auth-controls";
import {
  activityDateTimeZone,
  shouldShowActivityEnd,
  shouldShowActivityTime,
} from "@/utils/activity-date";
import { isActivityDeregistrationOpen, isActivitySignupOpen } from "@/utils/activity-registration";

function safeHttpUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function formatDate(ts: number, includeTime = true) {
  return new Date(ts).toLocaleDateString("en-GB", {
    timeZone: activityDateTimeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    timeZone: activityDateTimeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameActivityDay(startTime: number, endTime: number) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: activityDateTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(startTime) === formatter.format(endTime);
}

function formatBookingDate(ts: number) {
  if (ts <= 0) return "Date unavailable";
  return new Date(ts).toLocaleString("en-GB", {
    timeZone: activityDateTimeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityDetailContent({ slug }: { slug: string }) {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const activity = useQuery(api.activities.getActivity, { slug });
  const activityId = activity?._id;
  const status = useQuery(
    api.activityBookings.getActivityStatus,
    isAuthenticated && activityId ? { activityId } : "skip",
  );
  const participants = useQuery(
    api.activityBookings.getParticipants,
    status?.isAdmin && activityId ? { activityId } : "skip",
  );

  const register = useMutation(api.activityBookings.registerForActivity);
  const unregister = useMutation(api.activityBookings.unregisterFromActivity);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signupComment, setSignupComment] = useState("");

  async function handleRegister() {
    if (!activityId) return;
    setBusy(true);
    setActionError(null);
    try {
      await register({ activityId, comment: signupComment || undefined });
      setSignupComment("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnregister() {
    if (!activityId) return;
    setBusy(true);
    setActionError(null);
    try {
      await unregister({ activityId });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (activity === undefined) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (activity === null) {
    return <p className="text-white/80">Activity not found.</p>;
  }

  const now = Date.now();
  const signupTimingOpen = isActivitySignupOpen(activity, now);
  const registrationOpen = activity.allowSignup && signupTimingOpen;
  const deregistrationOpen = isActivityDeregistrationOpen(activity.endTime, now);
  const isFull =
    activity.maxParticipants !== undefined &&
    (status?.participantCount ?? 0) >= activity.maxParticipants;
  const loginUrl = `/login?redirect_uri=${encodeURIComponent(`/activities/${activity.slug}`)}`;
  const showStartTime = shouldShowActivityTime(activity.startTime);
  const showEnd = shouldShowActivityEnd(activity.startTime, activity.endTime);
  const showEndTime = shouldShowActivityTime(activity.endTime);
  const showCompactSameDayRange =
    showEnd &&
    showStartTime &&
    showEndTime &&
    isSameActivityDay(activity.startTime, activity.endTime);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Promotional image */}
      {activity.promotionalImage && (
        <div className="rounded-2xl overflow-hidden ring-1 ring-[#21526f]/20 shadow-md shadow-[#21526f]/10 bg-[#eaf3f7] flex justify-center">
          <img
            src={activity.promotionalImage}
            alt={activity.title}
            className="max-h-96 w-auto object-contain"
          />
        </div>
      )}

      {/* Title & meta */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-white">{activity.title}</h2>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[#d7eef8]">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0 text-[#8fc2da]" />
            {showCompactSameDayRange ? (
              <>
                {formatDate(activity.startTime)}-{formatTime(activity.endTime)}
              </>
            ) : (
              <>
                {showEnd && "From "}
                {formatDate(activity.startTime, showStartTime)}
                {showEnd && <> until {formatDate(activity.endTime, showEndTime)}</>}
              </>
            )}
          </span>
          {activity.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-[#8fc2da]" />
              {activity.location}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <Card className="p-6 rounded-2xl shadow-sm shadow-[#21526f]/5 max-w-none">
        <ActivityDescription>{activity.description}</ActivityDescription>
      </Card>

      {/* External sign-up section */}
      {activity.externalSignupUrl &&
        (() => {
          const safeUrl = safeHttpUrl(activity.externalSignupUrl);
          return (
            <Card className="p-6 rounded-2xl shadow-sm shadow-[#21526f]/5 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#21526f]" />
                <h3 className="text-lg font-semibold">Sign up</h3>
              </div>
              <p className="text-sm text-gray-600">
                Sign-ups for this activity are managed externally.
              </p>
              {!signupTimingOpen ? (
                <p className="text-sm text-gray-500">Registration is closed.</p>
              ) : !safeUrl ? (
                <p className="text-sm text-gray-500">Sign-up link is unavailable.</p>
              ) : isAuthLoading ? (
                <Skeleton className="h-9 w-36 rounded-full" />
              ) : !isAuthenticated ? (
                <Button asChild className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full">
                  <Link to={loginUrl}>Log in to sign up</Link>
                </Button>
              ) : (
                <Button asChild className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full">
                  <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                    Sign up
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              )}
            </Card>
          );
        })()}

      {/* Sign-up section — hidden when external sign-up URL takes precedence */}
      {activity.allowSignup && !activity.externalSignupUrl && (
        <Card className="p-6 rounded-2xl shadow-sm shadow-[#21526f]/5 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#21526f]" />
              <h3 className="text-lg font-semibold">Sign up</h3>
            </div>

            {((activity.maxParticipants !== undefined && status) ||
              activity.registrationDeadline) && (
              <div className="text-sm text-gray-600 space-y-1">
                {activity.maxParticipants !== undefined && status && (
                  <p>
                    {status.participantCount} / {activity.maxParticipants} spots filled
                  </p>
                )}
                {activity.registrationDeadline && (
                  <p>Register until: {formatDate(activity.registrationDeadline)}</p>
                )}
              </div>
            )}
          </div>

          {actionError && (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          {isAuthLoading || (isAuthenticated && status === undefined) ? (
            <Skeleton className="h-9 w-36 rounded-full" />
          ) : !isAuthenticated ? (
            registrationOpen ? (
              <Button asChild className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full">
                <Link to={loginUrl}>Log in to sign up</Link>
              </Button>
            ) : (
              <p className="text-gray-500 text-sm">Registration is closed.</p>
            )
          ) : status?.isRegistered ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-green-700 font-medium">You are signed up</span>
                {deregistrationOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={handleUnregister}
                    disabled={busy}
                  >
                    Cancel sign-up
                  </Button>
                )}
              </div>
              {status.comment && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-gray-700">Your comment</p>
                  <p className="whitespace-pre-wrap break-words rounded-md bg-[#f4f8fa] px-3 py-2 text-sm text-gray-700">
                    {status.comment}
                  </p>
                </div>
              )}
            </div>
          ) : registrationOpen && !isFull ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="signup-comment" className="text-sm font-medium text-gray-700">
                  Comment (optional)
                </label>
                <textarea
                  id="signup-comment"
                  value={signupComment}
                  onChange={(event) => setSignupComment(event.target.value)}
                  rows={4}
                  disabled={busy}
                  className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs outline-none placeholder:text-gray-400 focus:border-[#21526f] focus:ring-2 focus:ring-[#21526f]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Add a comment"
                />
              </div>
              <Button
                className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full"
                onClick={handleRegister}
                disabled={busy}
              >
                {busy ? "Processing…" : "Sign up"}
              </Button>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              {isFull ? "Activity is full." : "Registration is closed."}
            </p>
          )}
        </Card>
      )}

      {/* Sign-up list (admin only, including externally managed activities) */}
      {status?.isAdmin && (
        <Card className="p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">
              Sign-ups{participants ? ` (${participants.length})` : ""}
            </h3>
            {activity.externalSignupUrl && (
              <p className="text-sm text-gray-500">
                Imported from the externally managed sign-up system.
              </p>
            )}
          </div>
          <dl className="grid gap-3 rounded-2xl bg-[#f4f8fa] p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-gray-500">Register until</dt>
              <dd className="mt-1 text-gray-900">
                {activity.registrationDeadline
                  ? formatDate(activity.registrationDeadline)
                  : "Not specified"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Maximum participants</dt>
              <dd className="mt-1 text-gray-900">
                {activity.maxParticipants !== undefined ? activity.maxParticipants : "No limit"}
              </dd>
            </div>
          </dl>
          {participants === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-full" />
              ))}
            </div>
          ) : participants.length === 0 ? (
            <p className="text-gray-500 text-sm">No sign-ups yet.</p>
          ) : (
            <div className="space-y-2">
              {participants.map((p) => (
                <div
                  key={p._id}
                  className="px-4 py-3 bg-[#eaf3f7] border border-[#6fa8c4]/40 rounded-2xl space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {p.user?.name ?? "(unknown user)"}
                      </p>
                      <p className="text-sm text-gray-600">{p.user?.email || "No email address"}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 text-xs">
                      {p.source === "legacy" && (
                        <span className="rounded-full bg-[#21526f] px-2 py-1 font-medium text-white">
                          Imported
                        </span>
                      )}
                      {p.legacyStatus && (
                        <span className="rounded-full bg-white px-2 py-1 text-gray-700 ring-1 ring-gray-300">
                          {p.legacyStatus}
                        </span>
                      )}
                      {(p.spaces ?? 1) > 1 && (
                        <span className="rounded-full bg-white px-2 py-1 text-gray-700 ring-1 ring-gray-300">
                          {p.spaces} spots
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{formatBookingDate(p.registeredAt)}</div>
                  {p.comment && (
                    <p className="whitespace-pre-wrap break-words border-t border-[#6fa8c4]/30 pt-2 text-sm text-gray-700">
                      {p.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function ActivityPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const slug = params.slug ?? "";

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function handleBack() {
    if (location.state?.fromActivities) {
      navigate(-1);
      return;
    }

    navigate("/");
  }

  return (
    <div className="min-h-screen bg-[#21526f]">
      <header className="portal-header">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="border-[#21526f]/30 bg-white/80 text-[#21526f] shadow-sm hover:bg-[#eaf3f7] hover:text-[#21526f]"
                onClick={handleBack}
                aria-label="Back to activities"
                title="Back to activities"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <h1 className="text-2xl font-bold portal-title">Activity</h1>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  asChild
                  size="sm"
                  className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full shadow-sm shadow-[#21526f]/20"
                >
                  <Link to={`/activities/${slug}/edit`}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit activity
                  </Link>
                </Button>
              )}
              <HeaderAuthControls />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ActivityDetailContent slug={slug} />
      </main>
    </div>
  );
}
