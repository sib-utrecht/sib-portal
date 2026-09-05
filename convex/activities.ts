import { v } from "convex/values";
import { internalMutation, mutation, MutationCtx, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireLogin, requireAdmin } from "./auth";
import { Id } from "./_generated/dataModel";
import schema from "./schema";

const activityWithImageValidator = schema.doc("activities").extend({
  slug: v.string(),
  promotionalImage: v.optional(v.string()),
});

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

/** Return all public activities ordered by start time (ascending). */
export const getActivities = query({
  args: {},
  returns: v.array(activityWithImageValidator),
  handler: async (ctx) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_startTime")
      .order("asc")
      .collect();
    return await Promise.all(
      activities.map(async (a) => {
        if (!a.slug) {
          throw new Error("Activity slugs have not been backfilled yet");
        }
        return {
          ...a,
          slug: a.slug,
          promotionalImage: a.promotionalImageStorageId
            ? ((await ctx.storage.getUrl(a.promotionalImageStorageId)) ?? undefined)
            : a.promotionalImageUrl,
        };
      }),
    );
  },
});

/** Return a single public activity by its URL slug. */
export const getActivity = query({
  args: { slug: v.string() },
  returns: v.union(activityWithImageValidator, v.null()),
  handler: async (ctx, { slug }) => {
    const activity = await ctx.db
      .query("activities")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!activity?.slug) return null;
    return {
      ...activity,
      slug: activity.slug,
      promotionalImage: activity.promotionalImageStorageId
        ? ((await ctx.storage.getUrl(activity.promotionalImageStorageId)) ?? undefined)
        : activity.promotionalImageUrl,
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

const AMSTERDAM_TIME_ZONE = "Europe/Amsterdam";

/** Build the public activity slug, using the local date in Utrecht. */
export function activitySlugBase(title: string, startTime: number): string {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AMSTERDAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(startTime));
  const year = dateParts.find((part) => part.type === "year")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Could not determine the activity start month");

  const titleSlug = title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return `${year}-${month}-${titleSlug || "activity"}`;
}

export async function uniqueActivitySlug(
  ctx: MutationCtx,
  title: string,
  startTime: number,
  excludeId?: Id<"activities">,
): Promise<string> {
  const base = activitySlugBase(title, startTime);
  for (let suffix = 1; ; suffix++) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`;
    const existing = await ctx.db
      .query("activities")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!existing || existing._id === excludeId) return slug;
  }
}

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
  returns: v.object({ id: v.id("activities"), slug: v.string() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const fields = validateAndNormalizeActivity(args);
    const slug = await uniqueActivitySlug(ctx, fields.title, fields.startTime);
    const id = await ctx.db.insert("activities", { ...fields, slug });
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
    return { id, slug };
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
  returns: v.object({ slug: v.string() }),
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
    const normalized = validateAndNormalizeActivity(fields);
    const slug = await uniqueActivitySlug(ctx, normalized.title, normalized.startTime, id);
    await ctx.db.patch(id, { ...normalized, slug });
    return { slug };
  },
});

/**
 * Populate slugs for records created before the slug field was introduced.
 * Runs in bounded batches and schedules itself until every record is migrated.
 */
export const backfillActivitySlugs = internalMutation({
  args: {},
  returns: v.object({ updated: v.number(), complete: v.boolean() }),
  handler: async (ctx): Promise<{ updated: number; complete: boolean }> => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_slug", (q) => q.eq("slug", undefined))
      .take(100);

    for (const activity of activities) {
      const slug = await uniqueActivitySlug(ctx, activity.title, activity.startTime, activity._id);
      await ctx.db.patch(activity._id, { slug });
    }

    const complete = activities.length < 100;
    if (!complete) {
      await ctx.scheduler.runAfter(0, internal.activities.backfillActivitySlugs, {});
    }
    return { updated: activities.length, complete };
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
          activity: activity
            ? { _id: activity._id, title: activity.title, slug: activity.slug }
            : null,
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
