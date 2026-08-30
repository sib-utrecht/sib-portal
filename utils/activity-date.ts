const ACTIVITY_TIME_ZONE = "Europe/Amsterdam";

/** The external events API uses midnight to represent a date without a time. */
export function shouldShowActivityTime(timestamp: number, externalId?: string): boolean {
  if (!externalId) return true;

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

/** Equal imported endpoints are stored one minute apart to satisfy schema validation. */
export function shouldShowActivityEnd(
  startTime: number,
  endTime: number,
  externalId?: string,
): boolean {
  return !externalId || endTime - startTime > 60_000;
}

export const activityDateTimeZone = ACTIVITY_TIME_ZONE;
