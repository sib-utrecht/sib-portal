import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Users, Pencil, Trash2, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import {
  activityDateTimeZone,
  shouldShowActivityEnd,
  shouldShowActivityTime,
} from "@/utils/activity-date";

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
  const navigate = useNavigate();
  const activity = useQuery(api.activities.getActivity, { slug });
  const activityId = activity?._id;
  const status = useQuery(
    api.activityBookings.getActivityStatus,
    activityId ? { activityId } : "skip",
  );
  const participants = useQuery(
    api.activityBookings.getParticipants,
    status?.isAdmin && activityId ? { activityId } : "skip",
  );

  const register = useMutation(api.activityBookings.registerForActivity);
  const unregister = useMutation(api.activityBookings.unregisterFromActivity);
  const deleteActivity = useMutation(api.activities.deleteActivity);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleRegister() {
    if (!activityId) return;
    setBusy(true);
    setActionError(null);
    try {
      await register({ activityId });
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

  async function handleDelete() {
    if (!activityId) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteActivity({ id: activityId });
      navigate("/");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (activity === undefined || status === undefined) {
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
  const registrationOpen =
    activity.allowSignup &&
    (!activity.registrationDeadline || now <= activity.registrationDeadline);
  const isFull =
    activity.maxParticipants !== undefined &&
    (status.participantCount ?? 0) >= activity.maxParticipants;
  const showStartTime = shouldShowActivityTime(activity.startTime, activity.externalId);
  const showEnd = shouldShowActivityEnd(activity.startTime, activity.endTime, activity.externalId);
  const showEndTime = shouldShowActivityTime(activity.endTime, activity.externalId);
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
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-white">{activity.title}</h2>
          {status.isAdmin && (
            <div className="flex gap-2 shrink-0">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to={`/activities/${activity.slug}/edit`}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Button>
              {confirmDelete ? (
                <div className="flex gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full"
                    onClick={handleDelete}
                    disabled={busy}
                  >
                    Confirm delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

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
      <Card className="p-6 rounded-2xl shadow-sm shadow-[#21526f]/5 prose max-w-none">
        <ReactMarkdown
          rehypePlugins={[
            rehypeRaw,
            [
              rehypeSanitize,
              {
                ...defaultSchema,
                attributes: {
                  ...defaultSchema.attributes,
                  "*": ["style", "className", ...(defaultSchema.attributes?.["*"] ?? [])],
                },
              },
            ],
          ]}
        >
          {activity.description}
        </ReactMarkdown>
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
              {safeUrl ? (
                <Button asChild className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full">
                  <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                    Sign up
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-gray-500">Sign-up link is unavailable.</p>
              )}
            </Card>
          );
        })()}

      {/* Sign-up section — hidden when external sign-up URL takes precedence */}
      {activity.allowSignup && !activity.externalSignupUrl && (
        <Card className="p-6 rounded-2xl shadow-sm shadow-[#21526f]/5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#21526f]" />
            <h3 className="text-lg font-semibold">Sign up</h3>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            {activity.maxParticipants !== undefined && (
              <p>
                {status.participantCount} / {activity.maxParticipants} spots filled
              </p>
            )}
            {activity.registrationDeadline && (
              <p>Deadline: {formatDate(activity.registrationDeadline)}</p>
            )}
          </div>

          {actionError && (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          {status.isRegistered ? (
            <div className="flex items-center gap-4">
              <span className="text-green-700 font-medium">You are signed up</span>
              {registrationOpen && (
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
          ) : registrationOpen && !isFull ? (
            <Button
              className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full"
              onClick={handleRegister}
              disabled={busy}
            >
              {busy ? "Processing…" : "Sign up"}
            </Button>
          ) : (
            <p className="text-gray-500 text-sm">
              {isFull ? "Activity is full." : "Registration is closed."}
            </p>
          )}
        </Card>
      )}

      {/* Sign-up list (admin only, including externally managed activities) */}
      {status.isAdmin && (
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
              <dt className="font-medium text-gray-500">Registration deadline</dt>
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
                    <p className="border-t border-[#6fa8c4]/30 pt-2 text-sm text-gray-700">
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
  const slug = params.slug ?? "";

  return (
    <RequireAuth>
      <div className="min-h-screen bg-[#21526f]">
        <header className="portal-header">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 py-4">
              <Button
                asChild
                variant="outline"
                size="icon"
                className="border-[#21526f]/30 bg-white/80 text-[#21526f] shadow-sm hover:bg-[#eaf3f7] hover:text-[#21526f]"
              >
                <Link to="/" aria-label="Back to activities" title="Back to activities">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold portal-title">Activity</h1>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ActivityDetailContent slug={slug} />
        </main>
      </div>
    </RequireAuth>
  );
}
