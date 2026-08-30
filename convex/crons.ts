import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Import the newest events from the legacy source of truth every night.
// The importer is idempotent: events already present by externalId are skipped.
crons.daily(
  "backfill activities from legacy API",
  { hourUTC: 3, minuteUTC: 0 },
  internal.activities.backfillFromApi,
  { limit: 50, offset: 0 },
);

// Keep member profiles and their legacy activity bookings synchronized. The
// action imports a bounded batch and schedules continuations until complete.
crons.daily(
  "backfill users and bookings from legacy API",
  { hourUTC: 3, minuteUTC: 15 },
  internal.legacyBackfill.backfillUsersAndBookings,
  { limit: 20 },
);

export default crons;
