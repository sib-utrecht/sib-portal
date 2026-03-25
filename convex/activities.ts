import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireLogin, requireAdmin, isAdmin } from "./auth";

/** Return all activities ordered by start time (ascending). */
export const getActivities = query({
  args: {},
  handler: async (ctx) => {
    await requireLogin(ctx);
    return await ctx.db.query("activities").withIndex("by_startTime").order("asc").collect();
  },
});

/** Return a single activity by ID. */
export const getActivity = query({
  args: { id: v.id("activities") },
  handler: async (ctx, { id }) => {
    await requireLogin(ctx);
    return await ctx.db.get(id);
  },
});

/** Create a new activity. Admin only. */
export const createActivity = mutation({
  args: {
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    description: v.string(),
    promotionalImage: v.optional(v.string()),
    location: v.string(),
    allowSignup: v.boolean(),
    registrationDeadline: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("activities", args);
  },
});

/** Update an existing activity. Admin only. */
export const updateActivity = mutation({
  args: {
    id: v.id("activities"),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    description: v.string(),
    promotionalImage: v.optional(v.string()),
    location: v.string(),
    allowSignup: v.boolean(),
    registrationDeadline: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const activity = await ctx.db.get(id);
    if (!activity) throw new Error("Activity not found");
    await ctx.db.patch(id, fields);
  },
});

/** Delete an activity and all its registrations. Admin only. */
export const deleteActivity = mutation({
  args: { id: v.id("activities") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const registrations = await ctx.db
      .query("activityRegistrations")
      .withIndex("by_activity", (q) => q.eq("activityId", id))
      .collect();
    for (const reg of registrations) {
      await ctx.db.delete(reg._id);
    }
    await ctx.db.delete(id);
  },
});

/**
 * Return all registrations for an activity, with user details.
 * Admin only.
 */
export const getParticipants = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, { activityId }) => {
    await requireAdmin(ctx);
    const registrations = await ctx.db
      .query("activityRegistrations")
      .withIndex("by_activity", (q) => q.eq("activityId", activityId))
      .collect();

    return await Promise.all(
      registrations.map(async (reg) => {
        const user = await ctx.db.get(reg.userId);
        return {
          _id: reg._id,
          registeredAt: reg.registeredAt,
          user: user
            ? { _id: user._id, name: user.name, email: user.email }
            : null,
        };
      }),
    );
  },
});

/** Register the current user for an activity. */
export const registerForActivity = mutation({
  args: { activityId: v.id("activities") },
  handler: async (ctx, { activityId }) => {
    const identity = await requireLogin(ctx);

    const activity = await ctx.db.get(activityId);
    if (!activity) throw new Error("Activity not found");
    if (!activity.allowSignup) throw new Error("This activity does not allow sign-ups");
    if (activity.registrationDeadline && Date.now() > activity.registrationDeadline) {
      throw new Error("Registration deadline has passed");
    }

    // Find the user record by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
    if (!user) throw new Error("User profile not found");

    // Check for duplicate registration
    const existing = await ctx.db
      .query("activityRegistrations")
      .withIndex("by_activity_and_user", (q) =>
        q.eq("activityId", activityId).eq("userId", user._id),
      )
      .first();
    if (existing) throw new Error("Already registered for this activity");

    // Enforce max participants
    if (activity.maxParticipants !== undefined) {
      const count = await ctx.db
        .query("activityRegistrations")
        .withIndex("by_activity", (q) => q.eq("activityId", activityId))
        .collect();
      if (count.length >= activity.maxParticipants) {
        throw new Error("Activity is full");
      }
    }

    await ctx.db.insert("activityRegistrations", {
      activityId,
      userId: user._id,
      registeredAt: Date.now(),
    });
  },
});

/** Unregister the current user from an activity. */
export const unregisterFromActivity = mutation({
  args: { activityId: v.id("activities") },
  handler: async (ctx, { activityId }) => {
    const identity = await requireLogin(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
    if (!user) throw new Error("User profile not found");

    const registration = await ctx.db
      .query("activityRegistrations")
      .withIndex("by_activity_and_user", (q) =>
        q.eq("activityId", activityId).eq("userId", user._id),
      )
      .first();
    if (!registration) throw new Error("Not registered for this activity");

    await ctx.db.delete(registration._id);
  },
});

/**
 * Return the current user's registration for a given activity, or null.
 * Also returns the current participant count and whether the admin flag is set.
 */
export const getActivityStatus = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, { activityId }) => {
    const identity = await requireLogin(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();

    const registrations = await ctx.db
      .query("activityRegistrations")
      .withIndex("by_activity", (q) => q.eq("activityId", activityId))
      .collect();

    const isRegistered = user
      ? registrations.some((r) => r.userId === user._id)
      : false;

    const admin = await isAdmin(ctx);

    return {
      isRegistered,
      participantCount: registrations.length,
      isAdmin: admin,
    };
  },
});
