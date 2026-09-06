import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ActivityDescriptionEditors } from "@/components/activity-description-editors";
import { DateTimePicker } from "@/components/date-time-picker";

type ActivityFormData = {
  title: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
  description: string;
  location: string; // empty string means no location
  allowSignup: boolean;
  registrationDeadline: Date | undefined;
  maxParticipants: string;
};

function emptyForm(): ActivityFormData {
  return {
    title: "",
    startTime: undefined,
    endTime: undefined,
    description: "",
    location: "",
    allowSignup: false,
    registrationDeadline: undefined,
    maxParticipants: "",
  };
}

type InitialActivity = {
  title: string;
  startTime: number;
  endTime: number;
  description: string;
  promotionalImageStorageId?: Id<"_storage">;
  location?: string;
  allowSignup: boolean;
  registrationDeadline?: number;
  maxParticipants?: number;
};

function midnightOn(date: Date): Date {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

function isSameCalendarDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function calendarDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

function isMissingEndSelection(startTime: Date, endTime?: Date): boolean {
  return (
    endTime === undefined ||
    (isSameCalendarDay(startTime, endTime) &&
      endTime.getHours() === 0 &&
      endTime.getMinutes() === 0)
  );
}

function activityToForm(activity: InitialActivity): ActivityFormData {
  const startTime = new Date(activity.startTime);
  return {
    title: activity.title,
    startTime,
    endTime:
      activity.endTime === activity.startTime ? midnightOn(startTime) : new Date(activity.endTime),
    description: activity.description,
    location: activity.location ?? "",
    allowSignup: activity.allowSignup,
    registrationDeadline: activity.registrationDeadline
      ? new Date(activity.registrationDeadline)
      : undefined,
    maxParticipants: activity.maxParticipants?.toString() ?? "",
  };
}

export function ActivityForm({
  mode,
  activityId,
  initial,
  formId,
  onStatusChange,
}: {
  mode: "create" | "edit";
  activityId?: Id<"activities">;
  initial?: InitialActivity;
  formId?: string;
  onStatusChange?: (status: { dirty: boolean; saving: boolean; imageUploading: boolean }) => void;
}) {
  const navigate = useNavigate();
  const createActivity = useMutation(api.activities.createActivity);
  const updateActivity = useMutation(api.activities.updateActivity);
  const generateUploadUrl = useMutation(api.activities.generateUploadUrl);
  const trackUploadedImage = useMutation(api.activities.trackUploadedImage);

  const [form, setForm] = useState<ActivityFormData>(
    initial ? activityToForm(initial) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(
    initial?.promotionalImageStorageId ?? null,
  );
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedImageUrl = useQuery(
    api.activities.getImageUrl,
    imageStorageId ? { storageId: imageStorageId } : "skip",
  );

  const initialForm = initial ? activityToForm(initial) : emptyForm();
  const dirty =
    form.title !== initialForm.title ||
    form.startTime?.getTime() !== initialForm.startTime?.getTime() ||
    form.endTime?.getTime() !== initialForm.endTime?.getTime() ||
    form.description !== initialForm.description ||
    form.location !== initialForm.location ||
    form.allowSignup !== initialForm.allowSignup ||
    form.registrationDeadline?.getTime() !== initialForm.registrationDeadline?.getTime() ||
    form.maxParticipants !== initialForm.maxParticipants ||
    imageStorageId !== (initial?.promotionalImageStorageId ?? null);

  useEffect(() => {
    onStatusChange?.({ dirty, saving, imageUploading });
  }, [dirty, imageUploading, onStatusChange, saving]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await trackUploadedImage({ storageId, activityId: activityId ?? undefined });
      setImageStorageId(storageId);
    } catch {
      setError("Failed to upload image. Please try again.");
    } finally {
      setImageUploading(false);
    }
  }

  function set<K extends keyof ActivityFormData>(field: K, value: ActivityFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || imageUploading) return;
    setError(null);

    if (!form.description.trim()) {
      setError("A description is required. Enter text in the selected editor.");
      return;
    }

    if (!form.startTime) {
      setError("A start time is required.");
      return;
    }
    const missingEnd = isMissingEndSelection(form.startTime, form.endTime);
    if (!missingEnd && form.endTime && form.endTime < form.startTime) {
      setError("End time must not be before start time.");
      return;
    }

    let maxParticipants: number | undefined;
    if (form.allowSignup && form.maxParticipants) {
      const parsed = parseInt(form.maxParticipants, 10);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        setError("Maximum participants must be a whole number of at least 1.");
        return;
      }
      maxParticipants = parsed;
    }

    const payload = {
      title: form.title.trim(),
      startTime: form.startTime.getTime(),
      endTime: missingEnd ? form.startTime.getTime() : form.endTime!.getTime(),
      description: form.description,
      promotionalImageStorageId: imageStorageId ?? undefined,
      location: form.location.trim() || undefined,
      allowSignup: form.allowSignup,
      registrationDeadline:
        form.allowSignup && form.registrationDeadline
          ? form.registrationDeadline.getTime()
          : undefined,
      maxParticipants,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        const activity = await createActivity(payload);
        navigate(`/activities/${activity.slug}`);
      } else {
        if (!activityId) throw new Error("Missing activity ID");
        const activity = await updateActivity({
          id: activityId,
          ...payload,
          registrationDeadline: payload.registrationDeadline ?? null,
          maxParticipants: maxParticipants ?? null,
        });
        navigate(`/activities/${activity.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-6 max-w-2xl rounded-2xl bg-white p-6 shadow-sm sm:p-8"
    >
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Activity title"
          disabled={saving}
        />
      </div>

      {/* Start / End */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="startTime">Start</Label>
          <DateTimePicker
            id="startTime"
            value={form.startTime}
            onChange={(d) => {
              const previousStart = form.startTime;
              set("startTime", d);
              if (d && !form.endTime) {
                set("endTime", midnightOn(d));
              } else if (d && previousStart && form.endTime) {
                const dayDelta = calendarDayNumber(d) - calendarDayNumber(previousStart);
                const endDate = new Date(form.endTime);
                endDate.setDate(endDate.getDate() + dayDelta);
                set("endTime", endDate);
              }
            }}
            disabled={saving}
            required
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="endTime">End (optional)</Label>
          <DateTimePicker
            id="endTime"
            value={form.endTime}
            onChange={(d) => set("endTime", d)}
            disabled={saving}
            focusTime
            clearable
            nullDate={form.startTime ? midnightOn(form.startTime) : undefined}
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Location (optional)</Label>
        <Input
          id="location"
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="Location"
          disabled={saving}
        />
      </div>

      {/* Promotional image */}
      <div className="space-y-2">
        <Label>Promotional image (optional)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
          disabled={saving || imageUploading}
        />
        {imageStorageId && resolvedImageUrl && (
          <div className="rounded-lg overflow-hidden border border-input bg-muted flex justify-center">
            <img
              src={resolvedImageUrl}
              alt="Promotional image preview"
              className="max-h-64 w-auto object-contain"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving || imageUploading}
          >
            {imageUploading ? "Uploading…" : imageStorageId ? "Replace image" : "Upload image"}
          </Button>
          {imageStorageId && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setImageStorageId(null)}
              disabled={saving || imageUploading}
              className="text-red-600 hover:text-red-700"
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      <ActivityDescriptionEditors
        value={form.description}
        disabled={saving}
        onChange={(html) => set("description", html)}
      />

      {/* Allow sign-up */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="allowSignup"
          checked={form.allowSignup}
          onCheckedChange={(v) => set("allowSignup", v === true)}
          disabled={saving}
        />
        <Label htmlFor="allowSignup">Allow sign-ups</Label>
      </div>

      {form.allowSignup && (
        <div className="pl-6 border-l-2 border-[#21526f] space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registrationDeadline">Register until (optional)</Label>
            <DateTimePicker
              id="registrationDeadline"
              value={form.registrationDeadline}
              onChange={(d) => set("registrationDeadline", d)}
              disabled={saving}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Maximum participants (optional)</Label>
            <Input
              id="maxParticipants"
              type="number"
              min={1}
              value={form.maxParticipants}
              onChange={(e) => set("maxParticipants", e.target.value)}
              placeholder="Unlimited"
              disabled={saving}
            />
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={saving || imageUploading}
          className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full px-8"
        >
          {saving ? "Saving…" : mode === "create" ? "Create activity" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
