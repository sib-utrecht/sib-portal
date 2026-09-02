import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { cancelCurrentUserBooking, createCurrentUserBooking } from "../activityBookings";
import { requireLogin } from "../auth";
import { findActivity } from "./activityLookup";

/** Add a booking through the Flutter compatibility API. */
export const addBooking = internalMutation({
  args: { activityIdentifier: v.string(), comment: v.optional(v.string()) },
  returns: v.id("activityRegistrations"),
  handler: async (ctx, { activityIdentifier, comment }) => {
    const activity = await findActivity(ctx, activityIdentifier);
    if (!activity) throw new Error("Activity not found");
    const signupAllowed = activity.allowSignup || activity.legacySignupMethod === "api";
    return await createCurrentUserBooking(ctx, activity, comment, signupAllowed);
  },
});

/** Remove a booking through the Flutter compatibility API. */
export const removeBooking = internalMutation({
  args: { activityIdentifier: v.string() },
  returns: v.null(),
  handler: async (ctx, { activityIdentifier }) => {
    const activity = await findActivity(ctx, activityIdentifier);
    if (!activity) throw new Error("Activity not found");
    await cancelCurrentUserBooking(ctx, activity._id);
    return null;
  },
});

const bookingValidator = v.object({
  eventId: v.string(),
  comment: v.optional(v.string()),
  spaces: v.number(),
  registeredAt: v.number(),
  status: v.string(),
});

/** Current authenticated user's active bookings in the Flutter API shape. */
export const listCurrentUserBookings = internalQuery({
  args: {},
  returns: v.array(bookingValidator),
  handler: async (ctx) => {
    const identity = await requireLogin(ctx);
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();

    const conscriboId = Number.parseInt(identity.conscriboId, 10);
    const wordpressUserId = Number.isFinite(conscriboId) ? conscriboId + 1_000 : undefined;
    if (!user && wordpressUserId !== undefined) {
      user = await ctx.db
        .query("users")
        .withIndex("by_legacyWordpressUserId", (q) =>
          q.eq("legacyWordpressUserId", wordpressUserId),
        )
        .first();
    }
    if (!user) return [];

    const registrations = await ctx.db
      .query("activityRegistrations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(200);
    const bookings = await Promise.all(
      registrations
        .filter((registration) => registration.active !== false)
        .map(async (registration) => {
          const activity = await ctx.db.get(registration.activityId);
          return activity
            ? {
                eventId: activity.externalId ?? activity._id,
                comment: registration.comment,
                spaces: registration.spaces ?? 1,
                registeredAt: registration.registeredAt,
                status: registration.legacyStatus ?? "approved",
              }
            : null;
        }),
    );
    return bookings.filter((booking): booking is NonNullable<typeof booking> => booking !== null);
  },
});
