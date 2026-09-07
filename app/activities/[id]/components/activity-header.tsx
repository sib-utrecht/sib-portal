import { useState } from "react";
import { Calendar, MapPin, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  activityDateTimeZone,
  shouldShowActivityEnd,
  shouldShowActivityTime,
} from "@/utils/activity-date";
import { buildActivityShareText } from "@/utils/activity-sharing";
import type { Activity } from "./activity-types";

function formatDate(timestamp: number, includeTime = true) {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    timeZone: activityDateTimeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-GB", {
    timeZone: activityDateTimeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sameDay(startTime: number, endTime: number) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: activityDateTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(startTime) === formatter.format(endTime);
}

function imageFilename(title: string, mimeType: string) {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const basename = title
    .toLocaleLowerCase("en-GB")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `${basename || "activity"}.${extension}`;
}

export function ActivityHeader({ activity }: { activity: Activity }) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const showStartTime = shouldShowActivityTime(activity.startTime);
  const showEnd = shouldShowActivityEnd(activity.startTime, activity.endTime);
  const showEndTime = shouldShowActivityTime(activity.endTime);
  const compactRange =
    showEnd && showStartTime && showEndTime && sameDay(activity.startTime, activity.endTime);

  async function share() {
    setSharing(true);
    setShareError(null);
    const text = buildActivityShareText(activity);
    const fallback = () =>
      window.location.assign(
        `https://wa.me/?text=${encodeURIComponent(activity.promotionalImage ? `${text}\n\n${activity.promotionalImage}` : text)}`,
      );
    try {
      let imageFile: File | undefined;
      if (activity.promotionalImage && navigator.canShare) {
        try {
          const response = await fetch(activity.promotionalImage);
          if (!response.ok) throw new Error();
          const blob = await response.blob();
          const file = new File([blob], imageFilename(activity.title, blob.type), {
            type: blob.type || "image/jpeg",
          });
          if (navigator.canShare({ files: [file] })) imageFile = file;
        } catch {
          // Text sharing remains available if the image cannot be downloaded.
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
        }
      }
      fallback();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareError(error instanceof Error ? error.message : "Could not share this activity.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      {activity.promotionalImage && (
        <div className="flex justify-center overflow-hidden rounded-2xl bg-[#eaf3f7] shadow-md shadow-[#21526f]/10 ring-1 ring-[#21526f]/20">
          <img
            src={activity.promotionalImage}
            alt={activity.title}
            className="max-h-96 w-auto object-contain"
          />
        </div>
      )}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-white">{activity.title}</h2>
            {activity.visibility && activity.visibility !== "public" && (
              <Badge className="capitalize bg-white/95 text-[#21526f]">{activity.visibility}</Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={share}
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
            {compactRange ? (
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
    </>
  );
}
