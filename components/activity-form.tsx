import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ActivityDescriptionEditor } from "@/components/activity-description-editor";
import { DateTimePicker } from "@/components/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActivityVisibility = "draft" | "private" | "public";

type ActivityFormData = {
  visibility: ActivityVisibility;
  title: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
  description: string;
  location: string; // empty string means no location
  signupMethod: "none" | "external" | "portal";
  externalSignupUrl: string;
  registrationDeadline: Date | undefined;
  maxParticipants: string;
};

function emptyForm(): ActivityFormData {
  return {
    visibility: "draft",
    title: "",
    startTime: undefined,
    endTime: undefined,
    description: "",
    location: "",
    signupMethod: "none",
    externalSignupUrl: "",
    registrationDeadline: undefined,
    maxParticipants: "",
  };
}

type InitialActivity = {
  visibility?: ActivityVisibility;
  title: string;
  startTime: number;
  endTime: number;
  description: string;
  promotionalImageStorageId?: Id<"_storage">;
  location?: string;
  allowSignup: boolean;
  externalSignupUrl?: string;
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
    visibility: activity.visibility ?? "public",
    title: activity.title,
    startTime,
    endTime:
      activity.endTime === activity.startTime ? midnightOn(startTime) : new Date(activity.endTime),
    description: activity.description,
    location: activity.location ?? "",
    signupMethod: activity.externalSignupUrl
      ? "external"
      : activity.allowSignup
        ? "portal"
        : "none",
    externalSignupUrl: activity.externalSignupUrl ?? "",
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
    form.visibility !== initialForm.visibility ||
    form.title !== initialForm.title ||
    form.startTime?.getTime() !== initialForm.startTime?.getTime() ||
    form.endTime?.getTime() !== initialForm.endTime?.getTime() ||
    form.description !== initialForm.description ||
    form.location !== initialForm.location ||
    form.signupMethod !== initialForm.signupMethod ||
    form.externalSignupUrl !== initialForm.externalSignupUrl ||
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
      setError("A description is required. Enter a description.");
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
    if (form.signupMethod === "external") {
      try {
        const url = new URL(form.externalSignupUrl);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      } catch {
        setError("Enter a valid external sign-up URL starting with http:// or https://.");
        return;
      }
    }

    if (form.signupMethod === "portal" && form.maxParticipants) {
      const parsed = parseInt(form.maxParticipants, 10);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        setError("Maximum participants must be a whole number of at least 1.");
        return;
      }
      maxParticipants = parsed;
    }

    const payload = {
      visibility: form.visibility,
      title: form.title.trim(),
      startTime: form.startTime.getTime(),
      endTime: missingEnd ? form.startTime.getTime() : form.endTime!.getTime(),
      description: form.description,
      promotionalImageStorageId: imageStorageId ?? undefined,
      location: form.location.trim() || undefined,
      allowSignup: form.signupMethod === "portal",
      externalSignupUrl:
        form.signupMethod === "external" ? form.externalSignupUrl.trim() : undefined,
      registrationDeadline:
        form.signupMethod === "portal" && form.registrationDeadline
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
          externalSignupUrl: payload.externalSignupUrl ?? null,
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
      <div className="space-y-2">
        <Label htmlFor="visibility">Visibility</Label>
        <Select
          value={form.visibility}
          onValueChange={(value) => set("visibility", value as ActivityVisibility)}
          disabled={saving}
        >
          <SelectTrigger id="visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft — admins only</SelectItem>
            <SelectItem value="private">Signed-in members</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
      <ActivityDescriptionEditor
        value={form.description}
        disabled={saving}
        onChange={(html) => set("description", html)}
      />

      {/* Sign-up method */}
      <div className="space-y-3">
        <Label>Sign-ups</Label>
        <RadioGroup
          value={form.signupMethod}
          onValueChange={(value) => set("signupMethod", value as ActivityFormData["signupMethod"])}
          disabled={saving}
          className="gap-2"
        >
          {[
            ["none", "No sign-ups", "This activity does not require registration."],
            ["external", "External website", "Send members to another website to sign up."],
            ["portal", "On the portal", "Let logged-in members sign up on this activity page."],
          ].map(([value, title, description]) => (
            <Label
              key={value}
              htmlFor={`signup-${value}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3 font-normal has-[[data-state=checked]]:border-[#21526f] has-[[data-state=checked]]:bg-[#21526f]/5"
            >
              <RadioGroupItem id={`signup-${value}`} value={value} className="mt-0.5" />
              <span>
                <span className="block font-medium text-gray-900">{title}</span>
                <span className="block text-sm text-gray-500">{description}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {form.signupMethod === "external" && (
        <div className="space-y-2 border-l-2 border-[#21526f] pl-6">
          <Label htmlFor="externalSignupUrl">External sign-up URL</Label>
          <Input
            id="externalSignupUrl"
            type="url"
            required
            value={form.externalSignupUrl}
            onChange={(e) => set("externalSignupUrl", e.target.value)}
            placeholder="https://example.com/sign-up"
            disabled={saving}
          />
          <p className="text-sm text-gray-500">
            The Sign up button will open this page in a new tab.
          </p>
        </div>
      )}

      {form.signupMethod === "portal" && (
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
