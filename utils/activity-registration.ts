const AMSTERDAM_TIME_ZONE = "Europe/Amsterdam";

const amsterdamDateTimeParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: AMSTERDAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsAt(timestamp: number) {
  const parts = amsterdamDateTimeParts.formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/** Convert an Amsterdam wall-clock time to its Unix timestamp, including DST. */
function amsterdamTimeToTimestamp(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let timestamp = desiredAsUtc;

  // Resolving twice handles an offset change between the initial UTC guess and
  // the corresponding local time (for example around a DST transition).
  for (let attempt = 0; attempt < 3; attempt++) {
    const actual = partsAt(timestamp);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const correction = desiredAsUtc - actualAsUtc;
    if (correction === 0) break;
    timestamp += correction;
  }

  return timestamp;
}

/** Start of the calendar day after the activity ends, in Amsterdam. */
export function activityBookingCutoff(endTime: number): number {
  const end = partsAt(endTime);
  const nextDay = new Date(Date.UTC(end.year, end.month - 1, end.day + 1));
  return amsterdamTimeToTimestamp(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
  );
}

export function isActivitySignupOpen(
  activity: { endTime: number; registrationDeadline?: number },
  now = Date.now(),
): boolean {
  return activity.registrationDeadline !== undefined
    ? now <= activity.registrationDeadline
    : now < activityBookingCutoff(activity.endTime);
}

export function isActivityDeregistrationOpen(endTime: number, now = Date.now()): boolean {
  return now < activityBookingCutoff(endTime);
}
