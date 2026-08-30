import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const LEGACY_API_URL = "https://api2.sib-utrecht.nl/v2";
const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 50;

const bookingValidator = v.object({
  eventId: v.string(),
  bookingDate: v.optional(v.string()),
  spaces: v.optional(v.number()),
  comment: v.optional(v.string()),
  status: v.optional(v.string()),
});

type LegacyUser = {
  entityName: string;
  wordpressUserId?: number;
  name: string;
  email?: string;
  modified?: string;
};

type LegacyBooking = {
  eventId: string;
  bookingDate?: string;
  spaces?: number;
  comment?: string;
  status?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseLegacyUser(value: unknown): LegacyUser | null {
  const user = asRecord(value);
  if (!user) return null;

  const entityName = optionalString(user.entity_name);
  if (!entityName) return null;

  const details = asRecord(user.details);
  const name =
    optionalString(user.long_name) ??
    optionalString(user.short_name_unique) ??
    optionalString(user.short_name) ??
    entityName;

  return {
    entityName,
    wordpressUserId: optionalNumber(user.wordpress_user_id),
    name,
    email: optionalString(details?.email),
    modified: optionalString(user.modified),
  };
}

function parseLegacyBooking(value: unknown): LegacyBooking | null {
  const booking = asRecord(value);
  if (!booking) return null;

  const eventId = optionalString(booking.event_id);
  if (!eventId) return null;

  return {
    eventId,
    bookingDate: optionalString(booking.booking_date),
    spaces: optionalNumber(booking.spaces),
    comment: optionalString(booking.user_comment),
    status: optionalString(booking.status),
  };
}

function legacyHeaders(): HeadersInit {
  const apiKey = process.env.LEGACY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LEGACY_API_KEY is not configured. Set it to a full-read api2.sib-utrecht.nl API key.",
    );
  }
  return { Accept: "application/json", "X-Api-Key": apiKey };
}

async function fetchLegacyJson(path: string, headers: HeadersInit): Promise<unknown> {
  const response = await fetch(`${LEGACY_API_URL}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`Legacy API request failed for ${path}: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

function extractArray(json: unknown, field: "users" | "bookings"): unknown[] {
  const data = asRecord(asRecord(json)?.data);
  const values = data?.[field];
  if (!Array.isArray(values)) {
    throw new Error(`Legacy API response does not contain data.${field}`);
  }
  return values;
}

function bookingIsActive(status: string | undefined): boolean {
  return status === "approved" || status === "pending" || status === "waitlist-approved";
}

function bookingTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** Upsert one legacy user and all bookings returned for that user in one transaction. */
export const upsertUserAndBookings = internalMutation({
  args: {
    user: v.object({
      entityName: v.string(),
      wordpressUserId: v.optional(v.number()),
      name: v.string(),
      email: v.optional(v.string()),
      modified: v.optional(v.string()),
    }),
    bookings: v.array(bookingValidator),
  },
  returns: v.object({
    userInserted: v.boolean(),
    bookingsInserted: v.number(),
    bookingsUpdated: v.number(),
    activitiesMissing: v.number(),
  }),
  handler: async (ctx, { user, bookings }) => {
    const byWordpressId = user.wordpressUserId !== undefined
      ? await ctx.db
          .query("users")
          .withIndex("by_legacyWordpressUserId", (q) =>
            q.eq("legacyWordpressUserId", user.wordpressUserId),
          )
          .first()
      : null;
    const byEntityName = byWordpressId
      ? null
      : await ctx.db
          .query("users")
          .withIndex("by_legacyEntityName", (q) => q.eq("legacyEntityName", user.entityName))
          .first();
    const byEmail =
      byWordpressId || byEntityName || !user.email
        ? null
        : await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", user.email!))
            .first();

    const existingUser = byWordpressId ?? byEntityName ?? byEmail;
    const userId = existingUser
      ? existingUser._id
      : await ctx.db.insert("users", {
          name: user.name,
          email: user.email ?? "",
          role: "member",
          photoPermission: "nowhere",
          avatar: "",
          legacyEntityName: user.entityName,
          legacyWordpressUserId: user.wordpressUserId,
          legacyModifiedAt: user.modified,
        });

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        // Fill an address that was absent on an earlier import without
        // overwriting an address already managed in the portal.
        ...(existingUser.email === "" && user.email ? { email: user.email } : {}),
        legacyEntityName: user.entityName,
        legacyWordpressUserId: user.wordpressUserId,
        legacyModifiedAt: user.modified,
      });
    }

    let bookingsInserted = 0;
    let bookingsUpdated = 0;
    let activitiesMissing = 0;

    for (const booking of bookings) {
      const activity = await ctx.db
        .query("activities")
        .withIndex("by_externalId", (q) => q.eq("externalId", booking.eventId))
        .first();
      if (!activity) {
        activitiesMissing++;
        continue;
      }

      const existingRegistration = await ctx.db
        .query("activityRegistrations")
        .withIndex("by_activity_and_user", (q) =>
          q.eq("activityId", activity._id).eq("userId", userId),
        )
        .first();
      const fields = {
        registeredAt: bookingTimestamp(booking.bookingDate),
        source: "legacy" as const,
        legacyStatus: booking.status,
        spaces: booking.spaces,
        comment: booking.comment,
        active: bookingIsActive(booking.status),
      };

      if (existingRegistration) {
        await ctx.db.patch(existingRegistration._id, fields);
        bookingsUpdated++;
      } else {
        await ctx.db.insert("activityRegistrations", {
          activityId: activity._id,
          userId,
          ...fields,
        });
        bookingsInserted++;
      }
    }

    return {
      userInserted: !existingUser,
      bookingsInserted,
      bookingsUpdated,
      activitiesMissing,
    };
  },
});

/**
 * Import a bounded page of users and their bookings from the legacy API.
 * The next page schedules itself, making the full backfill resumable and safe
 * to start from the dashboard or the nightly cron.
 */
export const backfillUsersAndBookings = internalAction({
  args: {
    minWordpressUserId: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    fetchedUsers: v.number(),
    processedUsers: v.number(),
    usersInserted: v.number(),
    bookingsInserted: v.number(),
    bookingsUpdated: v.number(),
    activitiesMissing: v.number(),
    invalidUsers: v.number(),
    invalidBookings: v.number(),
    nextMinWordpressUserId: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, { minWordpressUserId, limit = DEFAULT_BATCH_SIZE }) => {
    const batchSize = Math.max(1, Math.min(Math.floor(limit), MAX_BATCH_SIZE));
    const headers = legacyHeaders();
    const query =
      minWordpressUserId === undefined ? "" : `?min_wp_user_id=${minWordpressUserId}`;
    const json = await fetchLegacyJson(`/users${query}`, headers);
    const rawUsers = extractArray(json, "users");
    const parsedUsers = rawUsers.map(parseLegacyUser);
    const invalidUsers = parsedUsers.filter((user) => user === null).length;
    const validUsers = parsedUsers.filter((user): user is LegacyUser => user !== null);
    // The legacy cursor only addresses WordPress-linked users. Import the
    // usually-small set of unlinked entities on the initial page so they are
    // not lost when subsequent requests use min_wp_user_id.
    const unlinkedUsers =
      minWordpressUserId === undefined
        ? validUsers.filter((user) => user.wordpressUserId === undefined)
        : [];
    const wordpressUsers = validUsers
      .filter((user) => user.wordpressUserId !== undefined)
      .sort((left, right) => left.wordpressUserId! - right.wordpressUserId!)
      .slice(0, batchSize);
    const users = [...unlinkedUsers, ...wordpressUsers];

    let usersInserted = 0;
    let bookingsInserted = 0;
    let bookingsUpdated = 0;
    let activitiesMissing = 0;
    let invalidBookings = 0;

    for (const user of users) {
      const parsedBookings = user.wordpressUserId !== undefined
        ? extractArray(
            await fetchLegacyJson(
              `/users/${encodeURIComponent(user.entityName)}/bookings`,
              headers,
            ),
            "bookings",
          ).map(parseLegacyBooking)
        : [];
      invalidBookings += parsedBookings.filter((booking) => booking === null).length;
      const validBookings = parsedBookings.filter(
        (booking): booking is LegacyBooking => booking !== null,
      );
      // The endpoint is newest-first and can contain an old cancelled row plus
      // a newer replacement for the same event. Keep only the newest state.
      const seenEventIds = new Set<string>();
      const bookings = validBookings.filter((booking) => {
        if (seenEventIds.has(booking.eventId)) return false;
        seenEventIds.add(booking.eventId);
        return true;
      });

      const result = await ctx.runMutation(internal.legacyBackfill.upsertUserAndBookings, {
        user,
        bookings,
      });
      usersInserted += result.userInserted ? 1 : 0;
      bookingsInserted += result.bookingsInserted;
      bookingsUpdated += result.bookingsUpdated;
      activitiesMissing += result.activitiesMissing;
    }

    const lastWordpressUserId = wordpressUsers[wordpressUsers.length - 1]?.wordpressUserId;
    const hasMore =
      wordpressUsers.length === batchSize &&
      lastWordpressUserId !== undefined &&
      validUsers.some(
        (user) =>
          user.wordpressUserId !== undefined && user.wordpressUserId > lastWordpressUserId,
      );
    const nextMinWordpressUserId = hasMore ? lastWordpressUserId + 1 : null;
    if (nextMinWordpressUserId !== null) {
      await ctx.scheduler.runAfter(0, internal.legacyBackfill.backfillUsersAndBookings, {
        minWordpressUserId: nextMinWordpressUserId,
        limit: batchSize,
      });
    }

    return {
      fetchedUsers: rawUsers.length,
      processedUsers: users.length,
      usersInserted,
      bookingsInserted,
      bookingsUpdated,
      activitiesMissing,
      invalidUsers,
      invalidBookings,
      nextMinWordpressUserId,
    };
  },
});
