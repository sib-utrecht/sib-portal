"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, Clock, Users, Pencil, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityDetailContent({ activityId }: { activityId: Id<"activities"> }) {
  const router = useRouter();
  const activity = useQuery(api.activities.getActivity, { id: activityId });
  const status = useQuery(api.activities.getActivityStatus, { activityId });
  const participants = useQuery(
    api.activities.getParticipants,
    status?.isAdmin ? { activityId } : "skip",
  );

  const register = useMutation(api.activities.registerForActivity);
  const unregister = useMutation(api.activities.unregisterFromActivity);
  const deleteActivity = useMutation(api.activities.deleteActivity);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleRegister() {
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
    setBusy(true);
    setActionError(null);
    try {
      await deleteActivity({ id: activityId });
      router.push("/activities");
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
    return <p className="text-gray-500">Activity not found.</p>;
  }

  const now = Date.now();
  const registrationOpen =
    activity.allowSignup &&
    (!activity.registrationDeadline || now <= activity.registrationDeadline);
  const isFull =
    activity.maxParticipants !== undefined &&
    (status.participantCount ?? 0) >= activity.maxParticipants;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Promotional image */}
      {activity.promotionalImage && (
        <div className="rounded-3xl overflow-hidden border-2 border-[#21526f] shadow-md bg-muted flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
          <h2 className="text-3xl font-bold text-gray-900">{activity.title}</h2>
          {status.isAdmin && (
            <div className="flex gap-2 shrink-0">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/activities/${activityId}/edit`}>
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

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0 text-[#21526f]" />
            {formatDate(activity.startTime)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0 text-[#21526f]" />
            Ends {formatDate(activity.endTime)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 text-[#21526f]" />
            {activity.location}
          </span>
        </div>
      </div>

      {/* Description */}
      <Card className="p-6 border-2 border-[#21526f] rounded-3xl shadow-sm prose max-w-none">
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

      {/* Sign-up section */}
      {activity.allowSignup && (
        <Card className="p-6 border-2 border-[#21526f] rounded-3xl shadow-sm space-y-4">
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

      {/* Participants list (admin only) */}
      {status.isAdmin && activity.allowSignup && (
        <Card className="p-6 border-2 border-gray-300 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Participants ({status.participantCount})
          </h3>
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
                  className="flex items-center justify-between px-4 py-2 bg-[#6fa8c4] rounded-full"
                >
                  <span className="font-semibold text-gray-900">{p.user?.name ?? "(unknown)"}</span>
                  <span className="text-sm text-gray-700">{p.user?.email}</span>
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
  const activityId = params.id as Id<"activities">;

  return (
    <RequireAuth>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-4xl font-bold text-gray-900 underline decoration-4">Activity</h1>
              <Button asChild variant="outline" size="sm">
                <Link href="/activities">Back to activities</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ActivityDetailContent activityId={activityId} />
        </main>
      </div>
    </RequireAuth>
  );
}
