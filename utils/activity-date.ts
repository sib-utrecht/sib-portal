const ACTIVITY_TIME_ZONE = "Europe/Amsterdam";

/** Midnight represents a date for which no time was specified. */
export function shouldShowActivityTime(timestamp: number): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACTIVITY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  return hour !== "00" || minute !== "00";
}

/** Matching start and end timestamps represent an activity without an end. */
export function shouldShowActivityEnd(startTime: number, endTime: number): boolean {
  return endTime !== startTime;
}

export const activityDateTimeZone = ACTIVITY_TIME_ZONE;
