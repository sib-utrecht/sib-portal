import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";
import { isAdmin, requireAdmin } from "./auth";
import { requireCurrentUser } from "./legacy/identity";

const participantValidator = v.object({
  _id: v.id("activityRegistrations"),
  registeredAt: v.number(),
  source: v.optional(v.union(v.literal("legacy"), v.literal("portal"))),
  legacyStatus: v.optional(v.string()),
  spaces: v.optional(v.number()),
  comment: v.optional(v.string()),
  user: v.union(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
    }),
    v.null(),
  ),
});

/** Return all active registrations for an activity. Admin only. */
export const getParticipants = query({
  args: { activityId: v.id("activities") },
  returns: v.array(participantValidator),
  handler: async (ctx, { activityId }) => {
    await requireAdmin(ctx);
    const registrations = await ctx.db
      .query("activityRegistrations")
      .withIndex("by_activity", (q) => q.eq("activityId", activityId))
      .take(1_000);

    return await Promise.all(
      registrations
        .filter((registration) => registration.active !== false)
        .sort((left, right) => right.registeredAt - left.registeredAt)
        .map(async (registration) => {
          const user = await ctx.db.get(registration.userId);
          return {
            _id: registration._id,
            registeredAt: registration.registeredAt,
            source: registration.source,
            legacyStatus: registration.legacyStatus,
            spaces: registration.spaces,
            comment: registration.comment,
            user: user ? { _id: user._id, name: user.name, email: user.email } : null,
          };
        }),
    );
  },
});

/** Shared transactional booking write used by portal and compatibility functions. */
export async function createCurrentUserBooking(
  ctx: MutationCtx,
  activity: Doc<"activities">,
  comment: string | undefined,
  signupAllowed: boolean,
) {
  if (!signupAllowed) throw new Error("This activity does not allow sign-ups");
  if (activity.registrationDeadline && Date.now() > activity.registrationDeadline) {
    throw new Error("Registration deadline has passed");
  }

  const user = await requireCurrentUser(ctx);
  const existing = await ctx.db
    .query("activityRegistrations")
    .withIndex("by_activity_and_user", (q) =>
      q.eq("activityId", activity._id).eq("userId", user._id),
    )
    .first();
  if (existing && existing.active !== false) {
    throw new Error("Already registered for this activity");
  }

  if (activity.maxParticipants !== undefined) {
    const registrations = await ctx.db
      .query("activityRegistrations")
      .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
      .take(1_000);
    const occupiedSpaces = registrations
      .filter((registration) => registration.active !== false)
      .reduce((total, registration) => total + (registration.spaces ?? 1), 0);
    if (occupiedSpaces >= activity.maxParticipants) throw new Error("Activity is full");
  }

  const fields = {
    registeredAt: Date.now(),
    source: "portal" as const,
    legacyStatus: "approved",
    spaces: 1,
    comment: comment?.trim() || undefined,
    active: true,
  };
  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }
  return await ctx.db.insert("activityRegistrations", {
    activityId: activity._id,
    userId: user._id,
    ...fields,
  });
}

/** Shared transactional cancellation used by portal and compatibility functions. */
export async function cancelCurrentUserBooking(ctx: MutationCtx, activityId: Id<"activities">) {
  const user = await requireCurrentUser(ctx);
  const registration = await ctx.db
    .query("activityRegistrations")
    .withIndex("by_activity_and_user", (q) => q.eq("activityId", activityId).eq("userId", user._id))
    .first();
  if (!registration || registration.active === false) {
    throw new Error("Not registered for this activity");
  }
  await ctx.db.patch(registration._id, {
    source: "portal",
    legacyStatus: "cancelled",
    active: false,
  });
}

/** Register the current user for a portal-managed activity. */
export const registerForActivity = mutation({
  args: { activityId: v.id("activities"), comment: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { activityId, comment }) => {
    const activity = await ctx.db.get(activityId);
    if (!activity) throw new Error("Activity not found");
    await createCurrentUserBooking(ctx, activity, comment, activity.allowSignup);
    return null;
  },
});

/** Unregister the current user from an activity. */
export const unregisterFromActivity = mutation({
  args: { activityId: v.id("activities") },
  returns: v.null(),
  handler: async (ctx, { activityId }) => {
    await cancelCurrentUserBooking(ctx, activityId);
    return null;
  },
});

/** Return booking state and participant count for an activity. */
export const getActivityStatus = query({
  args: { activityId: v.id("activities") },
  returns: v.object({
    isRegistered: v.boolean(),
    participantCount: v.number(),
    isAdmin: v.boolean(),
  }),
  handler: async (ctx, { activityId }) => {
    const user = await requireCurrentUser(ctx);

    const [registrations, userRegistration, admin] = await Promise.all([
      ctx.db
        .query("activityRegistrations")
        .withIndex("by_activity", (q) => q.eq("activityId", activityId))
        .take(1_000),
      ctx.db
        .query("activityRegistrations")
        .withIndex("by_activity_and_user", (q) =>
          q.eq("activityId", activityId).eq("userId", user._id),
        )
        .first(),
      isAdmin(ctx),
    ]);

    return {
      isRegistered: userRegistration !== null && userRegistration.active !== false,
      participantCount: registrations
        .filter((registration) => registration.active !== false)
        .reduce((total, registration) => total + (registration.spaces ?? 1), 0),
      isAdmin: admin,
    };
  },
});
