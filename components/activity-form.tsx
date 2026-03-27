"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DateTimePicker } from "@/components/date-time-picker";

type ActivityFormData = {
  title: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
  description: string;
  promotionalImage: string;
  location: string;
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
    promotionalImage: "",
    location: "",
    allowSignup: false,
    registrationDeadline: undefined,
    maxParticipants: "",
  };
}

function activityToForm(activity: {
  title: string;
  startTime: number;
  endTime: number;
  description: string;
  promotionalImage?: string;
  location: string;
  allowSignup: boolean;
  registrationDeadline?: number;
  maxParticipants?: number;
}): ActivityFormData {
  return {
    title: activity.title,
    startTime: new Date(activity.startTime),
    endTime: new Date(activity.endTime),
    description: activity.description,
    promotionalImage: activity.promotionalImage ?? "",
    location: activity.location,
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
}: {
  mode: "create" | "edit";
  activityId?: Id<"activities">;
  initial?: Parameters<typeof activityToForm>[0];
}) {
  const router = useRouter();
  const createActivity = useMutation(api.activities.createActivity);
  const updateActivity = useMutation(api.activities.updateActivity);
  const generateUploadUrl = useMutation(api.activities.generateUploadUrl);

  const [form, setForm] = useState<ActivityFormData>(
    initial ? activityToForm(initial) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [imageStorageId, setImageStorageId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedImageUrl = useQuery(
    api.activities.getImageUrl,
    imageStorageId ? { storageId: imageStorageId } : "skip",
  );

  useEffect(() => {
    if (resolvedImageUrl) {
      set("promotionalImage", resolvedImageUrl);
    }
  }, [resolvedImageUrl]);

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
    setError(null);

    if (!form.startTime || !form.endTime) {
      setError("Start and end times are required.");
      return;
    }
    if (form.endTime <= form.startTime) {
      setError("End time must be after start time.");
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
      endTime: form.endTime.getTime(),
      description: form.description,
      promotionalImage: form.promotionalImage.trim() || undefined,
      location: form.location.trim(),
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
        const id = await createActivity(payload);
        router.push(`/activities/${id}`);
      } else {
        if (!activityId) throw new Error("Missing activity ID");
        await updateActivity({ id: activityId, ...payload });
        router.push(`/activities/${activityId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start</Label>
          <DateTimePicker
            id="startTime"
            value={form.startTime}
            onChange={(d) => {
              set("startTime", d);
              if (d && !form.endTime) {
                const endDate = new Date(d);
                endDate.setHours(d.getHours() + 1, d.getMinutes(), 0, 0);
                set("endTime", endDate);
              } else if (d && form.endTime) {
                const endDate = new Date(form.endTime);
                endDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                set("endTime", endDate);
              }
            }}
            disabled={saving}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End</Label>
          <DateTimePicker
            id="endTime"
            value={form.endTime}
            onChange={(d) => set("endTime", d)}
            disabled={saving}
            required
            focusTime
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          required
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="e.g. Utrecht city centre"
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
        {(resolvedImageUrl ?? form.promotionalImage) && (
          <div className="rounded-lg overflow-hidden border border-input bg-muted flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedImageUrl ?? form.promotionalImage}
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
            {imageUploading
              ? "Uploading…"
              : form.promotionalImage
                ? "Replace image"
                : "Upload image"}
          </Button>
          {form.promotionalImage && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                set("promotionalImage", "");
                setImageStorageId(null);
              }}
              disabled={saving || imageUploading}
              className="text-red-600 hover:text-red-700"
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (Markdown, HTML tags allowed)</Label>
        <textarea
          id="description"
          required
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe the activity…"
          disabled={saving}
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 font-mono"
        />
      </div>

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
            <Label htmlFor="registrationDeadline">Registration deadline (optional)</Label>
            <DateTimePicker
              id="registrationDeadline"
              value={form.registrationDeadline}
              onChange={(d) => set("registrationDeadline", d)}
              disabled={saving}
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
          disabled={saving}
          className="bg-[#21526f] hover:bg-[#1a3f55] text-white rounded-full px-8"
        >
          {saving ? "Saving…" : mode === "create" ? "Create activity" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => router.back()}
          className="rounded-full"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
