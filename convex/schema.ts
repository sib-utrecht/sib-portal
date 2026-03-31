import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex database schema for the SIB portal.
 *
 * Tables:
 * - `users`      — one row per member; stores profile info and photo-permission consent.
 * - `committees` — one row per committee; stores the TOTP secret used to generate
 *                  door-access tokens and the list of Conscribo IDs for its members.
 */
export default defineSchema({
  /**
   * Member profile records.  A row is created the first time a member logs in
   * and their Cognito identity is resolved against an existing Conscribo record.
   */
  users: defineTable({
    /** Full display name (given + family name). */
    name: v.string(),
    /** Primary email address; used to match the Cognito identity to this record. */
    email: v.string(),
    /** Access level — `"admin"` users can view and manage all member records. */
    role: v.union(v.literal("admin"), v.literal("member")),
    /**
     * The member's photo-usage consent level:
     * - `"internal+external"` — may be used in internal and external communications.
     * - `"internal"` — may only be used for internal communications.
     * - `"nowhere"` — must not be used anywhere.
     */
    photoPermission: v.union(
      v.literal("internal+external"),
      v.literal("internal"),
      v.literal("nowhere"),
    ),
    /** URL of the member's profile avatar image. */
    avatar: v.string(),
  }).index("by_email", ["email"]),
  /**
   * Committee records used to generate TOTP 2FA codes for logging in to each
   * committee's Google account.
   * The `secret` field is never returned to clients; it is only read server-side
   * via the `internal.committees.querySecret` internal query.
   */
  committees: defineTable({
    /** Human-readable committee name shown to members. */
    name: v.string(),
    /** Base-32 TOTP secret used to generate time-based one-time 2FA codes. */
    secret: v.string(),
    /** List of Conscribo IDs for members who belong to this committee. */
    members: v.array(v.string()),
  }),

  /**
   * Activities (events) organised by SIB Utrecht.
   */
  activities: defineTable({
    /** Activity title. */
    title: v.string(),
    /** Unix timestamp (ms) for when the activity starts. */
    startTime: v.number(),
    /** Unix timestamp (ms) for when the activity ends. */
    endTime: v.number(),
    /** HTML description of the activity. */
    description: v.string(),
    /** Convex storage ID of the promotional image. */
    promotionalImageStorageId: v.optional(v.id("_storage")),
    /**
     * External URL of the promotional image (e.g. from the SIB API).
     * Used when the image is not stored in Convex storage.
     */
    promotionalImageUrl: v.optional(v.string()),
    /** Location where the activity takes place. */
    location: v.optional(v.string()),
    /** Whether members can sign up for this activity via this portal. */
    allowSignup: v.boolean(),
    /**
     * Unix timestamp (ms) after which sign-ups are closed.
     * Only present when `allowSignup` is true.
     */
    registrationDeadline: v.optional(v.number()),
    /**
     * Maximum number of participants allowed to sign up.
     * Only present when `allowSignup` is true.
     */
    maxParticipants: v.optional(v.number()),
    /**
     * External URL for signing up (e.g. an external ticket/registration page).
     * When present, clicking "Sign up" opens this URL instead of using this portal's registration.
     */
    externalSignupUrl: v.optional(v.string()),
    /**
     * External ID from the source system (e.g. "wp-237" from the SIB API).
     * Used to prevent duplicate imports when backfilling.
     */
    externalId: v.optional(v.string()),
  }).index("by_startTime", ["startTime"])
    .index("by_externalId", ["externalId"]),

  /**
   * Tracks every promotional image ever uploaded for an activity.
   * Images are kept in storage even when replaced; deletion happens manually
   * via the admin storage page.
   */
  activityImages: defineTable({
    /** Convex storage ID of the image. */
    storageId: v.id("_storage"),
    /**
     * The activity this image was uploaded for.
     * Absent when the image was uploaded but the activity form was never saved.
     */
    activityId: v.optional(v.id("activities")),
    /** Unix timestamp (ms) when the image was uploaded. */
    uploadedAt: v.number(),
  })
    .index("by_activity", ["activityId"])
    .index("by_storageId", ["storageId"]),

  /**
   * Registrations linking a user to an activity they have signed up for.
   */
  activityRegistrations: defineTable({
    /** The activity this registration belongs to. */
    activityId: v.id("activities"),
    /** The user who registered. */
    userId: v.id("users"),
    /** Unix timestamp (ms) when the registration was created. */
    registeredAt: v.number(),
  })
    .index("by_activity", ["activityId"])
    .index("by_user", ["userId"])
    .index("by_activity_and_user", ["activityId", "userId"]),
});
