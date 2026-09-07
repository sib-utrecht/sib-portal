import { v } from "convex/values";
import { mutation, MutationCtx, query } from "./_generated/server";
import { getAuthenticatedIdentity, requireLogin, requireAdmin } from "./auth";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { findCurrentUser } from "./legacy/identity";

const activityWithImageValidator = schema.doc("activities").extend({
  promotionalImage: v.optional(v.string()),
});

const activityListItemValidator = activityWithImageValidator.extend({
  isSignedUp: v.boolean(),
});

const activityChangeValidator = schema.doc("activityChanges");

export type ActivityVisibility = "draft" | "private" | "public";

/** Historical activities predate visibility and are public by default. */
export function activityVisibility(activity: {
  visibility?: ActivityVisibility;
}): ActivityVisibility {
  return activity.visibility ?? "public";
}

async function canViewActivity(
  ctx: Parameters<typeof getAuthenticatedIdentity>[0],
  activity: { visibility?: ActivityVisibility },
): Promise<boolean> {
  const visibility = activityVisibility(activity);
  if (visibility === "public") return true;
  const identity = await getAuthenticatedIdentity(ctx);
  if (!identity) return false;
  return visibility === "private" || identity.groups.includes("admins");
}

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

/** Return all activities visible to the current visitor, ordered by start time. */
export const getActivities = query({
  args: {},
  returns: v.array(activityListItemValidator),
  handler: async (ctx) => {
    const identity = await getAuthenticatedIdentity(ctx);
    const admin = identity?.groups.includes("admins") ?? false;
    const visibilities: Array<ActivityVisibility | undefined> = admin
      ? [undefined, "public", "private", "draft"]
      : identity
        ? [undefined, "public", "private"]
        : [undefined, "public"];
    const activities = (
      await Promise.all(
        visibilities.map((visibility) =>
          ctx.db
            .query("activities")
            .withIndex("by_visibility_and_startTime", (q) => q.eq("visibility", visibility))
            .order("asc")
            .collect(),
        ),
      )
    )
      .flat()
      .sort((left, right) => left.startTime - right.startTime);

    const currentUser = identity ? await findCurrentUser(ctx, identity) : null;
    const activeRegistrationActivityIds = new Set(
      currentUser
        ? (
            await ctx.db
              .query("activityRegistrations")
              .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
              .take(1_000)
          )
            .filter((registration) => registration.active !== false)
            .map((registration) => registration.activityId)
        : [],
    );

    return await Promise.all(
      activities.map(async (a) => {
        return {
          ...a,
          isSignedUp: activeRegistrationActivityIds.has(a._id),
          promotionalImage: a.promotionalImageStorageId
            ? ((await ctx.storage.getUrl(a.promotionalImageStorageId)) ?? undefined)
            : a.promotionalImageUrl,
        };
      }),
    );
  },
});

/** Return a single activity when it is visible to the current visitor. */
export const getActivity = query({
  args: { slug: v.string() },
  returns: v.union(activityWithImageValidator, v.null()),
  handler: async (ctx, { slug }) => {
    const slugRoute = await ctx.db
      .query("activitySlugs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    const activity = slugRoute ? await ctx.db.get(slugRoute.activityId) : null;
    if (!activity || !(await canViewActivity(ctx, activity))) return null;
    return {
      ...activity,
      promotionalImage: activity.promotionalImageStorageId
        ? ((await ctx.storage.getUrl(activity.promotionalImageStorageId)) ?? undefined)
        : activity.promotionalImageUrl,
    };
  },
});

/** Return the most recent field-level edits for an activity. Admin only. */
export const getActivityChanges = query({
  args: { activityId: v.id("activities") },
  returns: v.array(activityChangeValidator),
  handler: async (ctx, { activityId }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("activityChanges")
      .withIndex("by_activity_and_changedAt", (q) => q.eq("activityId", activityId))
      .order("desc")
      .take(200);
  },
});

type ActivityFields = {
  visibility: ActivityVisibility;
  title: string;
  startTime: number;
  endTime: number;
  description: string;
  promotionalImageStorageId?: Id<"_storage">;
  location?: string;
  allowSignup: boolean;
  externalSignupUrl?: string;
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
    const existingRoute = await ctx.db
      .query("activitySlugs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existingRoute) {
      if (existingRoute.activityId === excludeId) return slug;
      continue;
    }
    return slug;
  }
}

/** Ensure a slug is permanently reserved for an activity. */
export async function ensureActivitySlugRoute(
  ctx: MutationCtx,
  activityId: Id<"activities">,
  slug: string,
): Promise<void> {
  const existing = await ctx.db
    .query("activitySlugs")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (existing) {
    if (existing.activityId !== activityId) {
      throw new Error(`Activity slug is already in use: ${slug}`);
    }
    return;
  }
  await ctx.db.insert("activitySlugs", { slug, activityId });
}

function validateAndNormalizeActivity(fields: ActivityFields): ActivityFields {
  const title = fields.title.trim();
  if (title === "") {
    throw new Error("title must not be empty or whitespace-only");
  }
  const location = fields.location?.trim() || undefined;
  const externalSignupUrl = fields.externalSignupUrl?.trim() || undefined;
  fields = { ...fields, title, location, externalSignupUrl };
  if (fields.endTime < fields.startTime) {
    throw new Error("endTime must not be before startTime");
  }
  if (fields.allowSignup && fields.externalSignupUrl) {
    throw new Error("Portal sign-ups and an external sign-up URL cannot both be enabled");
  }
  if (fields.externalSignupUrl) {
    try {
      const url = new URL(fields.externalSignupUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch {
      throw new Error("externalSignupUrl must be a valid HTTP or HTTPS URL");
    }
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
    visibility: v.union(v.literal("draft"), v.literal("private"), v.literal("public")),
    title: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    description: v.string(),
    promotionalImageStorageId: v.optional(v.id("_storage")),
    location: v.optional(v.string()),
    allowSignup: v.boolean(),
    externalSignupUrl: v.optional(v.string()),
    registrationDeadline: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
  },
  returns: v.object({ id: v.id("activities"), slug: v.string() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const fields = validateAndNormalizeActivity({
      ...args,
      endTime: args.endTime ?? args.startTime,
    });
    const slug = await uniqueActivitySlug(ctx, fields.title, fields.startTime);
    const id = await ctx.db.insert("activities", { ...fields, slug });
    await ensureActivitySlugRoute(ctx, id, slug);
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
    visibility: v.union(v.literal("draft"), v.literal("private"), v.literal("public")),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    description: v.string(),
    promotionalImageStorageId: v.optional(v.id("_storage")),
    location: v.optional(v.string()),
    allowSignup: v.boolean(),
    externalSignupUrl: v.union(v.string(), v.null()),
    registrationDeadline: v.union(v.number(), v.null()),
    maxParticipants: v.union(v.number(), v.null()),
  },
  returns: v.object({ slug: v.string() }),
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const identity = await requireLogin(ctx);
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
    const normalized = validateAndNormalizeActivity({
      ...fields,
      registrationDeadline: fields.registrationDeadline ?? undefined,
      maxParticipants: fields.maxParticipants ?? undefined,
      externalSignupUrl: fields.externalSignupUrl ?? undefined,
    });
    const slug = await uniqueActivitySlug(ctx, normalized.title, normalized.startTime, id);
    await ensureActivitySlugRoute(ctx, id, slug);
    const updated = { ...normalized, slug };
    await ctx.db.patch(id, updated);

    const auditableFields = [
      "visibility",
      "title",
      "slug",
      "startTime",
      "endTime",
      "description",
      "promotionalImageStorageId",
      "location",
      "allowSignup",
      "externalSignupUrl",
      "registrationDeadline",
      "maxParticipants",
    ] as const;
    const changedAt = Date.now();
    const changeId = `${id}:${changedAt}:${crypto.randomUUID()}`;
    for (const field of auditableFields) {
      const oldValue = activity[field] ?? null;
      const newValue = updated[field] ?? null;
      if (oldValue === newValue) continue;
      await ctx.db.insert("activityChanges", {
        activityId: id,
        changeId,
        field,
        oldValue,
        newValue,
        changedAt,
        changedByTokenIdentifier: identity.tokenIdentifier,
        changedByEmail: identity.email,
      });
    }
    return { slug };
  },
});

/** Delete an activity, its registrations, and all its stored images. Admin only. */
export const deleteActivity = mutation({
  args: { id: v.id("activities") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const activity = await ctx.db.get(id);
    for await (const route of ctx.db
      .query("activitySlugs")
      .withIndex("by_activityId", (q) => q.eq("activityId", id))) {
      await ctx.db.delete(route._id);
    }
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
