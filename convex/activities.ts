import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireLogin, requireAdmin, isAdmin } from "./auth";
import { Id } from "./_generated/dataModel";

/** Generate a short-lived upload URL for storing a promotional image. Admin only. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Record an uploaded image immediately after it lands in storage, before the
 * activity form is saved. This ensures every upload is visible in the storage
 * management page even if the form is abandoned.
 * Admin only.
 */
export const trackUploadedImage = mutation({
  args: {
    storageId: v.id("_storage"),
    activityId: v.optional(v.id("activities")),
  },
  handler: async (ctx, { storageId, activityId }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("activityImages")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first();
    if (!existing) {
      await ctx.db.insert("activityImages", { storageId, activityId, uploadedAt: Date.now() });
    }
  },
});

/** Resolve a Convex storage ID to a public URL. */
export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    await requireLogin(ctx);
    return await ctx.storage.getUrl(storageId as Id<"_storage">);
  },
});

/** Return all activities ordered by start time (ascending). */
export const getActivities = query({
  args: {},
  handler: async (ctx) => {
    await requireLogin(ctx);
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_startTime")
      .order("asc")
      .collect();
    return await Promise.all(
      activities.map(async (a) => ({
        ...a,
        promotionalImage: a.promotionalImageStorageId
          ? ((await ctx.storage.getUrl(a.promotionalImageStorageId)) ?? undefined)
          : undefined,
      })),
    );
  },
});

/** Return a single activity by ID. */
export const getActivity = query({
  args: { id: v.id("activities") },
  handler: async (ctx, { id }) => {
    await requireLogin(ctx);
    const activity = await ctx.db.get(id);
    if (!activity) return null;
    return {
      ...activity,
      promotionalImage: activity.promotionalImageStorageId
        ? ((await ctx.storage.getUrl(activity.promotionalImageStorageId)) ?? undefined)
        : undefined,
    };
  },
});

type ActivityFields = {
  title: string;
  startTime: number;
  endTime: number;
  description: string;
  promotionalImageStorageId?: Id<"_storage">;
  location?: string;
  allowSignup: boolean;
  registrationDeadline?: number;
  maxParticipants?: number;
};

function validateAndNormalizeActivity(fields: ActivityFields): ActivityFields {
  const title = fields.title.trim();
  if (title === "") {
    throw new Error("title must not be empty or whitespace-only");
  }
  const location = fields.location?.trim() || undefined;
  fields = { ...fields, title, location };
  if (fields.endTime <= fields.startTime) {
    throw new Error("endTime must be after startTime");
  }
  if (!fields.allowSignup) {
    // Strip signup-only fields so they can't be set inconsistently
    return { ...fields, registrationDeadline: undefined, maxParticipants: undefined };
  }
  if (fields.registrationDeadline !== undefined && fields.registrationDeadline > fields.startTime) {
    throw new Error("registrationDeadline must be before the activity starts");
  }
  if (fields.maxParticipants !== undefined) {
    const isValid = Number.isInteger(fields.maxParticipants) && fields.maxParticipants >= 1;
    if (!isValid) {
      throw new Error("maxParticipants must be an integer >= 1");
    }
  }
  return fields;
}

/** Create a new activity. Admin only. */
export const createActivity = mutation({
  args: {
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    description: v.string(),
    promotionalImageStorageId: v.optional(v.id("_storage")),
    location: v.optional(v.string()),
    allowSignup: v.boolean(),
    registrationDeadline: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const id = await ctx.db.insert("activities", validateAndNormalizeActivity(args));
    if (args.promotionalImageStorageId) {
      // Link the tracking record created at upload time, or create one for pre-existing images
      const existing = await ctx.db
        .query("activityImages")
        .withIndex("by_storageId", (q) => q.eq("storageId", args.promotionalImageStorageId!))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { activityId: id });
      } else {
        await ctx.db.insert("activityImages", {
          storageId: args.promotionalImageStorageId,
          activityId: id,
          uploadedAt: Date.now(),
        });
      }
    }
    return id;
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
    promotionalImageStorageId: v.optional(v.id("_storage")),
    location: v.optional(v.string()),
    allowSignup: v.boolean(),
    registrationDeadline: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const activity = await ctx.db.get(id);
    if (!activity) throw new Error("Activity not found");
    // If a new image was set, link its tracking record — the old one is kept in storage
    if (
      fields.promotionalImageStorageId &&
      fields.promotionalImageStorageId !== activity.promotionalImageStorageId
    ) {
      const existing = await ctx.db
        .query("activityImages")
        .withIndex("by_storageId", (q) => q.eq("storageId", fields.promotionalImageStorageId!))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { activityId: id });
      } else {
        await ctx.db.insert("activityImages", {
          storageId: fields.promotionalImageStorageId,
          activityId: id,
          uploadedAt: Date.now(),
        });
      }
    }
    await ctx.db.patch(id, validateAndNormalizeActivity(fields));
  },
});

/** Delete an activity, its registrations, and all its stored images. Admin only. */
export const deleteActivity = mutation({
  args: { id: v.id("activities") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const activity = await ctx.db.get(id);
    // Delete all tracked images for this activity
    const imageRecords = await ctx.db
      .query("activityImages")
      .withIndex("by_activity", (q) => q.eq("activityId", id))
      .collect();
    const trackedStorageIds = new Set(imageRecords.map((r) => r.storageId));
    for (const record of imageRecords) {
      await ctx.storage.delete(record.storageId);
      await ctx.db.delete(record._id);
    }
    // Also clean up the current image if it predates the tracking table
    if (
      activity?.promotionalImageStorageId &&
      !trackedStorageIds.has(activity.promotionalImageStorageId)
    ) {
      await ctx.storage.delete(activity.promotionalImageStorageId);
    }
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
 * List all tracked activity images with metadata. Includes images no longer
 * linked to their activity (replaced ones). Admin only.
 */
export const listActivityImages = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const imageRecords = await ctx.db.query("activityImages").order("desc").collect();
    return await Promise.all(
      imageRecords.map(async (record) => {
        const [url, metadata, activity] = await Promise.all([
          ctx.storage.getUrl(record.storageId),
          ctx.db.system.get(record.storageId),
          record.activityId ? ctx.db.get(record.activityId) : Promise.resolve(null),
        ]);
        return {
          storageId: record.storageId,
          url,
          size: metadata?.size,
          contentType: metadata?.contentType,
          uploadedAt: record.uploadedAt,
          isCurrentImage: activity?.promotionalImageStorageId === record.storageId,
          activity: activity ? { _id: activity._id, title: activity.title } : null,
        };
      }),
    );
  },
});

/**
 * Delete an image from storage. If it is currently the active promotional image
 * of its activity, it is also unlinked. Admin only.
 */
export const deleteStorageImage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
    await requireAdmin(ctx);
    const imageRecord = await ctx.db
      .query("activityImages")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first();
    if (imageRecord) {
      if (imageRecord.activityId) {
        const activity = await ctx.db.get(imageRecord.activityId);
        if (activity?.promotionalImageStorageId === storageId) {
          await ctx.db.patch(imageRecord.activityId, { promotionalImageStorageId: undefined });
        }
      }
      await ctx.db.delete(imageRecord._id);
    }
    await ctx.storage.delete(storageId);
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
          user: user ? { _id: user._id, name: user.name, email: user.email } : null,
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

    const [participantCount, userRegistration, admin] = await Promise.all([
      ctx.db
        .query("activityRegistrations")
        .withIndex("by_activity", (q) => q.eq("activityId", activityId))
        .collect()
        .then((r) => r.length),
      user
        ? ctx.db
            .query("activityRegistrations")
            .withIndex("by_activity_and_user", (q) =>
              q.eq("activityId", activityId).eq("userId", user._id),
            )
            .first()
        : Promise.resolve(null),
      isAdmin(ctx),
    ]);

    return {
      isRegistered: userRegistration !== null,
      participantCount,
      isAdmin: admin,
    };
  },
});
