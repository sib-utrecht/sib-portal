import { Navigate, useLocation, useParams, useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Component,
  useLayoutEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Pencil,
  ExternalLink,
  Grid3X3,
  List,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ActivityDescription } from "@/components/activity-description";
import { HeaderAuthControls } from "@/components/header-auth-controls";
import {
  activityDateTimeZone,
  shouldShowActivityEnd,
  shouldShowActivityTime,
} from "@/utils/activity-date";
import { isActivityDeregistrationOpen, isActivitySignupOpen } from "@/utils/activity-registration";
import { buildActivityShareText } from "@/utils/activity-sharing";

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

const participantAvatarColors = [
  "bg-[#21526f]",
  "bg-[#397b84]",
  "bg-[#7a5c8f]",
  "bg-[#a45c61]",
  "bg-[#5f7654]",
  "bg-[#9a6b38]",
] as const;

function participantAvatarColor(name: string) {
  const hash = Array.from(name).reduce((total, character) => total + character.codePointAt(0)!, 0);
  return participantAvatarColors[hash % participantAvatarColors.length];
}

function participantInitial(name: string) {
  return Array.from(name.trim())[0]?.toLocaleUpperCase("en-GB") ?? "?";
}

function sharedImageFilename(title: string, mimeType: string): string {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const basename = title
    .toLocaleLowerCase("en-GB")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `${basename || "activity"}.${extension}`;
}

class SignupErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Activity sign-up failed to render:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const needsActivation = this.state.error.message.includes(
      "No imported member record with a name found",
    );
    return (
      <Card className="p-6 rounded-2xl shadow-sm shadow-[#21526f]/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#21526f]" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-gray-900">
              {needsActivation ? "Your account still needs to be activated" : "Sign-up unavailable"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {needsActivation
                ? "You are signed in, but your membership has not been activated in the portal yet. Please contact the board before signing up for this activity."
                : "We couldn’t load the sign-up options. Please try again later."}
            </p>
          </div>
        </div>
      </Card>
    );
  }
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
  const cancelledParticipants = useQuery(
    api.activityBookings.getCancelledParticipants,
    status?.isAdmin && activityId ? { activityId } : "skip",
  );

  const register = useMutation(api.activityBookings.registerForActivity);
  const unregister = useMutation(api.activityBookings.unregisterFromActivity);
  const updateUserShortName = useMutation(api.users.updateUserShortName);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signupComment, setSignupComment] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [participantView, setParticipantView] = useState<"list" | "grid">("grid");
  const [participantSort, setParticipantSort] = useState<"newest" | "alphabetical">("newest");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [editingShortName, setEditingShortName] = useState(false);
  const [shortNameDraft, setShortNameDraft] = useState("");
  const [shortNameBusy, setShortNameBusy] = useState(false);
  const [shortNameError, setShortNameError] = useState<string | null>(null);

  const selectedParticipant = participants?.find(
    (participant) => participant._id === selectedParticipantId,
  );
  const displayedParticipants = useMemo(() => {
    if (!participants) return [];
    if (participantSort === "newest") return participants;

    return [...participants].sort((left, right) =>
      (left.user?.shortName ?? "Unknown").localeCompare(right.user?.shortName ?? "Unknown", "en", {
        sensitivity: "base",
      }),
    );
  }, [participants, participantSort]);

  async function handleShortNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedParticipant?.user) return;

    const shortName = shortNameDraft.trim();
    if (!shortName) {
      setShortNameError("Short name cannot be empty.");
      return;
    }

    setShortNameBusy(true);
    setShortNameError(null);
    try {
      await updateUserShortName({ id: selectedParticipant.user._id, shortName });
      setEditingShortName(false);
    } catch (error) {
      setShortNameError(error instanceof Error ? error.message : "Could not update short name.");
    } finally {
      setShortNameBusy(false);
    }
  }

  async function handleWhatsAppShare() {
    if (!activity) return;

    setSharing(true);
    setShareError(null);
    const text = buildActivityShareText(activity);
    const openWhatsAppFallback = () => {
      const fallbackText = activity.promotionalImage
        ? `${text}\n\n${activity.promotionalImage}`
        : text;
      window.location.assign(`https://wa.me/?text=${encodeURIComponent(fallbackText)}`);
    };

    try {
      let imageFile: File | undefined;

      if (activity.promotionalImage && navigator.canShare) {
        try {
          const response = await fetch(activity.promotionalImage);
          if (!response.ok) throw new Error("Could not download the activity image.");

          const blob = await response.blob();
          const file = new File([blob], sharedImageFilename(activity.title, blob.type), {
            type: blob.type || "image/jpeg",
          });

          if (navigator.canShare({ files: [file] })) imageFile = file;
        } catch {
          // Native text sharing remains available if the image cannot be downloaded.
        }
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: activity.title,
            text,
            ...(imageFile ? { files: [imageFile] } : {}),
          });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          // Fall through to the WhatsApp link when the native share attempt fails.
        }
      }

      openWhatsAppFallback();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareError(error instanceof Error ? error.message : "Could not share this activity.");
    } finally {
      setSharing(false);
    }
  }

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
      <div className="w-full space-y-4">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (activity === null) {
    return <p className="text-white/80">Activity not found.</p>;
  }

  if (activity.slug !== slug) {
    return <Navigate to={`/activities/${activity.slug}`} replace />;
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
  const canHaveManagedSignups = activity.allowSignup || activity.legacySignupMethod === "api";
  const showAdminSignupList =
    status?.isAdmin &&
    ((participants !== undefined && participants.length > 0) ||
      (cancelledParticipants !== undefined && cancelledParticipants.length > 0) ||
      canHaveManagedSignups);

  return (
    <div className="w-full space-y-8">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-white">{activity.title}</h2>
            {activity.visibility && activity.visibility !== "public" && (
              <Badge className="bg-white/95 text-[#21526f] capitalize">{activity.visibility}</Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={handleWhatsAppShare}
            disabled={sharing}
            aria-label={sharing ? "Preparing activity to share" : "Share activity on WhatsApp"}
            title="Share activity on WhatsApp"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </Button>
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
        {shareError && <p className="text-sm text-red-200">{shareError}</p>}
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
        <SignupErrorBoundary>
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

            {status?.needsActivation ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  <span className="font-medium">Your account still needs to be activated.</span> You
                  are signed in, but your membership has not been activated in the portal yet.
                  Please contact the board before signing up for this activity.
                </AlertDescription>
              </Alert>
            ) : (
              actionError && (
                <Alert variant="destructive">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )
            )}

            {status?.needsActivation ? null : isAuthLoading ||
              (isAuthenticated && status === undefined) ? (
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
        </SignupErrorBoundary>
      )}

      {/* Sign-up list for admins when registrations exist or are managed by a synced source. */}
      {showAdminSignupList && (
        <Card className="p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
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
            <div className="flex flex-wrap justify-end gap-2">
              <div
                className="flex rounded-full border border-gray-200 bg-gray-50 p-1"
                role="group"
                aria-label="Sign-up order"
              >
                <button
                  type="button"
                  onClick={() => setParticipantSort("newest")}
                  aria-pressed={participantSort === "newest"}
                  className={`flex h-8 items-center rounded-full px-3 text-sm font-medium transition-colors ${
                    participantSort === "newest"
                      ? "bg-white text-[#21526f] shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Newest
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantSort("alphabetical")}
                  aria-label="Sort alphabetically"
                  aria-pressed={participantSort === "alphabetical"}
                  className={`flex h-8 items-center rounded-full px-3 text-sm font-medium transition-colors ${
                    participantSort === "alphabetical"
                      ? "bg-white text-[#21526f] shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  A–Z
                </button>
              </div>
              <div
                className="flex rounded-full border border-gray-200 bg-gray-50 p-1"
                role="group"
                aria-label="Sign-up view"
              >
                <button
                  type="button"
                  onClick={() => setParticipantView("list")}
                  aria-label="Show detailed list"
                  aria-pressed={participantView === "list"}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${
                    participantView === "list"
                      ? "bg-white text-[#21526f] shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantView("grid")}
                  aria-label="Show compact grid"
                  aria-pressed={participantView === "grid"}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${
                    participantView === "grid"
                      ? "bg-white text-[#21526f] shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
              </div>
            </div>
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
          ) : participantView === "list" ? (
            <div className="space-y-2">
              {displayedParticipants.map((p) => (
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
                      {p.legacyStatus !== undefined && p.legacyStatus !== "approved" && (
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
          ) : (
            <div className="grid grid-cols-4 gap-x-1 gap-y-3 sm:grid-cols-5 md:grid-cols-6">
              {displayedParticipants.map((participant) => {
                const shortName = participant.user?.shortName ?? "Unknown";
                const hasComment = Boolean(participant.comment?.trim());

                return (
                  <button
                    key={participant._id}
                    type="button"
                    onClick={() => setSelectedParticipantId(participant._id)}
                    className="group flex min-w-0 flex-col items-center rounded-2xl px-0 py-2 text-center transition-colors hover:bg-[#f4f8fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21526f] focus-visible:ring-offset-2"
                    aria-label={`View details for ${shortName}${hasComment ? ", has a comment" : ""}`}
                  >
                    <span className="relative">
                      <span
                        className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold text-white shadow-sm ${participantAvatarColor(shortName)}`}
                        aria-hidden="true"
                      >
                        {participantInitial(shortName)}
                      </span>
                      {hasComment && (
                        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#e79b37] text-white shadow-sm">
                          <MessageCircle className="h-3 w-3 fill-current" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="mt-2 w-full truncate text-sm font-medium text-gray-800 group-hover:text-[#21526f]">
                      {shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <Dialog
            open={Boolean(selectedParticipant)}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedParticipantId(null);
                setEditingShortName(false);
                setShortNameError(null);
              }
            }}
          >
            {selectedParticipant && (
              <DialogContent className="max-w-md rounded-2xl border-0 bg-white">
                <DialogHeader className="pr-8 text-left">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white ${participantAvatarColor(selectedParticipant.user?.shortName ?? "Unknown")}`}
                      aria-hidden="true"
                    >
                      {participantInitial(selectedParticipant.user?.shortName ?? "Unknown")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <DialogTitle>
                          {selectedParticipant.user?.shortName ?? "Unknown participant"}
                        </DialogTitle>
                        {selectedParticipant.user && (
                          <button
                            type="button"
                            onClick={() => {
                              setShortNameDraft(selectedParticipant.user!.shortName);
                              setShortNameError(null);
                              setEditingShortName(true);
                            }}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-[#eaf3f7] hover:text-[#21526f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21526f]"
                            aria-label={`Edit short name for ${selectedParticipant.user.shortName}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <DialogDescription className="mt-1">
                        {selectedParticipant.user?.name ?? "User details unavailable"}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  {editingShortName && selectedParticipant.user && (
                    <form
                      onSubmit={handleShortNameSubmit}
                      className="rounded-xl border border-[#6fa8c4]/30 bg-[#f4f8fa] p-3"
                    >
                      <label
                        htmlFor="participant-short-name"
                        className="text-xs font-medium uppercase tracking-wide text-gray-500"
                      >
                        Short name
                      </label>
                      <div className="mt-2 flex gap-2">
                        <Input
                          id="participant-short-name"
                          value={shortNameDraft}
                          onChange={(event) => setShortNameDraft(event.target.value)}
                          maxLength={100}
                          autoFocus
                          disabled={shortNameBusy}
                          aria-invalid={Boolean(shortNameError)}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={shortNameBusy || shortNameDraft.trim().length === 0}
                          className="bg-[#21526f] text-white hover:bg-[#1a3f55]"
                        >
                          {shortNameBusy ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={shortNameBusy}
                          onClick={() => {
                            setEditingShortName(false);
                            setShortNameError(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      {shortNameError && (
                        <p className="mt-2 text-sm text-red-700" role="alert">
                          {shortNameError}
                        </p>
                      )}
                    </form>
                  )}
                  <dl className="grid gap-3 rounded-xl bg-[#f4f8fa] p-4">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Email
                      </dt>
                      <dd className="mt-1 break-words text-gray-900">
                        {selectedParticipant.user?.email || "No email address"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Signed up
                      </dt>
                      <dd className="mt-1 text-gray-900">
                        {formatBookingDate(selectedParticipant.registeredAt)}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {selectedParticipant.source === "legacy" && <Badge>Imported</Badge>}
                    {selectedParticipant.legacyStatus !== undefined &&
                      selectedParticipant.legacyStatus !== "approved" && (
                        <Badge variant="outline">{selectedParticipant.legacyStatus}</Badge>
                      )}
                    {(selectedParticipant.spaces ?? 1) > 1 && (
                      <Badge variant="outline">{selectedParticipant.spaces} spots</Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Comment</h4>
                    {selectedParticipant.comment?.trim() ? (
                      <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-[#6fa8c4]/30 bg-[#eaf3f7] p-3 text-gray-700">
                        {selectedParticipant.comment}
                      </p>
                    ) : (
                      <p className="mt-1 text-gray-500">No comment left.</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            )}
          </Dialog>

          {cancelledParticipants !== undefined && cancelledParticipants.length > 0 && (
            <details className="group rounded-2xl border border-dashed border-gray-300 bg-gray-50/80">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
                <span>Cancelled sign-ups ({cancelledParticipants.length})</span>
                <span className="text-xs font-normal text-gray-500 group-open:hidden">
                  Show history
                </span>
                <span className="hidden text-xs font-normal text-gray-500 group-open:inline">
                  Hide history
                </span>
              </summary>
              <div className="space-y-2 border-t border-gray-200 px-4 py-4">
                <p className="text-xs text-gray-500">
                  Former registrations, ordered by the most recent cancellation.
                </p>
                {cancelledParticipants.map((participant) => (
                  <div
                    key={participant._id}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-600"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div>
                        <p className="font-medium text-gray-800">
                          {participant.user?.name ?? "(unknown user)"}
                        </p>
                        <p className="text-sm">{participant.user?.email || "No email address"}</p>
                      </div>
                      {participant.legacyStatus !== undefined &&
                        participant.legacyStatus !== "cancelled" && (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                            {participant.legacyStatus}
                          </span>
                        )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {participant.cancelledAt
                        ? `Cancelled ${formatBookingDate(participant.cancelledAt)}`
                        : "Cancellation time unavailable"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Signed up {formatBookingDate(participant.registeredAt)}
                    </p>
                  </div>
                ))}
              </div>
            </details>
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
