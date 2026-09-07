import { Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/require-admin";
import { ActivityForm } from "@/components/activity-form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { History, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { HeaderAuthControls } from "@/components/header-auth-controls";

const activityFormId = "edit-activity-form";

type FormStatus = {
  dirty: boolean;
  saving: boolean;
  imageUploading: boolean;
};

const fieldLabels: Record<string, string> = {
  visibility: "Visibility",
  title: "Title",
  slug: "URL slug",
  startTime: "Start",
  endTime: "End",
  description: "Description",
  promotionalImageStorageId: "Promotional image",
  location: "Location",
  allowSignup: "Portal sign-ups",
  externalSignupUrl: "External sign-up URL",
  registrationDeadline: "Registration deadline",
  maxParticipants: "Maximum participants",
};

function displayChangeValue(field: string, value: string | number | boolean | null) {
  if (value === null) return "Not set";
  if (field === "startTime" || field === "endTime" || field === "registrationDeadline") {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Amsterdam",
    }).format(value as number);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field === "promotionalImageStorageId") return value ? "Image set" : "Not set";
  const text = String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 180 ? `${text.slice(0, 177)}…` : text || "Empty";
}

function ActivityHistory({ activityId }: { activityId: Id<"activities"> }) {
  const changes = useQuery(api.activities.getActivityChanges, { activityId });
  const events = changes?.reduce<
    Array<{
      changeId: string;
      changedAt: number;
      changedByEmail: string;
      changes: Doc<"activityChanges">[];
    }>
  >((groups, change) => {
    const current = groups.at(-1);
    if (current?.changeId === change.changeId) current.changes.push(change);
    else
      groups.push({
        changeId: change.changeId,
        changedAt: change.changedAt,
        changedByEmail: change.changedByEmail,
        changes: [change],
      });
    return groups;
  }, []);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-[#21526f]" />
        <h2 className="font-semibold text-gray-900">Change history</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Field changes recorded whenever this activity is saved.
      </p>

      {changes === undefined ? (
        <Skeleton className="mt-4 h-20 rounded-md" />
      ) : events?.length ? (
        <ol className="mt-5 space-y-5">
          {events.map((event) => (
            <li key={event.changeId} className="border-l-2 border-[#21526f]/20 pl-4">
              <p className="text-sm font-medium text-gray-900">
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Europe/Amsterdam",
                }).format(event.changedAt)}
              </p>
              <p className="text-xs text-gray-500">by {event.changedByEmail}</p>
              <div className="mt-3 space-y-3">
                {event.changes.map((change) => (
                  <div key={change._id} className="text-sm">
                    <p className="font-medium text-gray-700">
                      {fieldLabels[change.field] ?? change.field}
                    </p>
                    <div className="mt-1 grid gap-1 text-gray-600 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
                      <span className="break-words rounded bg-red-50 px-2 py-1 line-through decoration-red-300">
                        {displayChangeValue(change.field, change.oldValue)}
                      </span>
                      <span className="hidden pt-1 text-gray-400 sm:block">→</span>
                      <span className="break-words rounded bg-green-50 px-2 py-1">
                        {displayChangeValue(change.field, change.newValue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-gray-500">No changes have been recorded yet.</p>
      )}
    </section>
  );
}

function EditActivityContent({
  slug,
  onFormStatusChange,
}: {
  slug: string;
  onFormStatusChange: (status: FormStatus) => void;
}) {
  const navigate = useNavigate();
  const activity = useQuery(api.activities.getActivity, { slug });
  const deleteActivity = useMutation(api.activities.deleteActivity);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!activity) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteActivity({ id: activity._id });
      navigate("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong.");
      setDeleting(false);
    }
  }

  if (activity === undefined) {
    return (
      <div className="space-y-4 max-w-2xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md bg-white/60" />
        ))}
      </div>
    );
  }

  if (activity === null) {
    return <p className="text-white/80">Activity not found.</p>;
  }

  if (activity.slug !== slug) {
    return <Navigate to={`/activities/${activity.slug}/edit`} replace />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <ActivityForm
        mode="edit"
        activityId={activity._id}
        initial={activity}
        formId={activityFormId}
        onStatusChange={onFormStatusChange}
      />

      <ActivityHistory activityId={activity._id} />

      <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-semibold text-gray-900">Delete activity</h2>
        <p className="mt-1 text-sm text-gray-600">
          Permanently delete this activity and its sign-ups.
        </p>

        {deleteError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {confirmDelete ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete activity
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

export default function EditActivityPage() {
  const params = useParams();
  const slug = params.slug ?? "";
  const navigate = useNavigate();
  const [formStatus, setFormStatus] = useState<FormStatus>({
    dirty: false,
    saving: false,
    imageUploading: false,
  });
  const handleFormStatusChange = useCallback((status: FormStatus) => {
    setFormStatus(status);
  }, []);
  const navigationIsBlocked = formStatus.dirty && !formStatus.saving;

  useEffect(() => {
    if (!navigationIsBlocked) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [navigationIsBlocked]);

  function cancelEditing() {
    if (navigationIsBlocked && !window.confirm("Discard your unsaved changes?")) {
      return;
    }
    navigate(`/activities/${slug}`);
  }

  const saveDisabled = formStatus.saving || formStatus.imageUploading;

  return (
    <RequireAuth>
      <RequireAdmin>
        <div className="min-h-screen bg-[#21526f]">
          <header className="portal-header">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <h1 className="text-2xl font-bold portal-title">Edit activity</h1>
                <HeaderAuthControls />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[#21526f]/10 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formStatus.saving}
                  onClick={cancelEditing}
                  className="rounded-full border-[#21526f]/30 hover:bg-[#eaf3f7] hover:text-[#21526f]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form={activityFormId}
                  size="sm"
                  disabled={saveDisabled}
                  className="rounded-full bg-[#21526f] px-6 text-white hover:bg-[#1a3f55]"
                >
                  {formStatus.saving
                    ? "Saving…"
                    : formStatus.imageUploading
                      ? "Uploading…"
                      : "Save changes"}
                </Button>
              </div>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EditActivityContent slug={slug} onFormStatusChange={handleFormStatusChange} />
          </main>
        </div>
      </RequireAdmin>
    </RequireAuth>
  );
}
