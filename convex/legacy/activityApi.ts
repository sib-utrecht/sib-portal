import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { requireAdmin } from "../auth";
import { findActivity } from "./activityLookup";

const activityValidator = v.object({
  id: v.string(),
  convexId: v.id("activities"),
  externalId: v.optional(v.string()),
  title: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  description: v.string(),
  promotionalImage: v.optional(v.string()),
  location: v.optional(v.string()),
  allowSignup: v.boolean(),
  registrationDeadline: v.optional(v.number()),
  maxParticipants: v.optional(v.number()),
  externalSignupUrl: v.optional(v.string()),
  legacySignupMethod: v.optional(v.union(v.literal("none"), v.literal("api"), v.literal("url"))),
  participantCount: v.number(),
});

async function asApiActivity(ctx: QueryCtx, activity: Doc<"activities">) {
  const registrations = await ctx.db
    .query("activityRegistrations")
    .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
    .take(1_000);
  return {
    id: activity.externalId ?? activity._id,
    convexId: activity._id,
    externalId: activity.externalId,
    title: activity.title,
    startTime: activity.startTime,
    endTime: activity.endTime,
    description: activity.description,
    promotionalImage: activity.promotionalImageStorageId
      ? ((await ctx.storage.getUrl(activity.promotionalImageStorageId)) ?? undefined)
      : activity.promotionalImageUrl,
    location: activity.location,
    allowSignup: activity.allowSignup,
    registrationDeadline: activity.registrationDeadline,
    maxParticipants: activity.maxParticipants,
    externalSignupUrl: activity.externalSignupUrl,
    legacySignupMethod: activity.legacySignupMethod,
    participantCount: registrations
      .filter((registration) => registration.active !== false)
      .reduce((total, registration) => total + (registration.spaces ?? 1), 0),
  };
}

/** Bounded activity read model for the compatibility HTTP API. */
export const listActivities = internalQuery({
  args: {
    after: v.optional(v.number()),
    before: v.optional(v.number()),
    descending: v.boolean(),
    offset: v.number(),
    limit: v.number(),
  },
  returns: v.array(activityValidator),
  handler: async (ctx, args) => {
    const query = ctx.db.query("activities").withIndex("by_endTime", (q) => {
      if (args.after !== undefined && args.before !== undefined) {
        return q.gte("endTime", args.after).lt("endTime", args.before);
      }
      if (args.after !== undefined) return q.gte("endTime", args.after);
      if (args.before !== undefined) return q.lt("endTime", args.before);
      return q;
    });
    const activities = await query
      .order(args.descending ? "desc" : "asc")
      .take(args.offset + args.limit);
    return await Promise.all(
      activities.slice(args.offset).map((activity) => asApiActivity(ctx, activity)),
    );
  },
});

/** Look up an activity by legacy external ID or native Convex ID. */
export const getActivity = internalQuery({
  args: { id: v.string() },
  returns: v.union(activityValidator, v.null()),
  handler: async (ctx, { id }) => {
    const activity = await findActivity(ctx, id);
    return activity ? await asApiActivity(ctx, activity) : null;
  },
});

const entityValidator = v.object({
  type: v.literal("user"),
  details: v.object({ email: v.string() }),
  entity_name: v.string(),
  wordpress_user_id: v.optional(v.number()),
  long_name: v.string(),
  short_name: v.string(),
  short_name_unique: v.string(),
  pronouns: v.null(),
  modified: v.optional(v.string()),
});

const participantValidator = v.object({
  id: v.union(v.number(), v.null()),
  user_id: v.union(v.string(), v.null()),
  name: v.union(v.string(), v.null()),
  name_first: v.union(v.string(), v.null()),
  comment: v.union(v.string(), v.null()),
  spaces: v.number(),
  entity_name: v.union(v.string(), v.null()),
  short_name: v.union(v.string(), v.null()),
  short_name_unique: v.union(v.string(), v.null()),
  long_name: v.union(v.string(), v.null()),
  entity: v.union(entityValidator, v.null()),
});

/** Flutter-compatible participant list. Admin only. */
export const listParticipants = internalQuery({
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
          const entity = user
            ? {
                type: "user" as const,
                details: { email: user.email },
                entity_name: user.legacyEntityName ?? user._id,
                wordpress_user_id: user.legacyWordpressUserId,
                long_name: user.name,
                short_name: user.name,
                short_name_unique: user.name,
                pronouns: null,
                modified: user.legacyModifiedAt,
              }
            : null;
          return {
            id: entity?.wordpress_user_id ?? null,
            user_id: entity?.entity_name ?? null,
            name: user?.name ?? null,
            name_first: user?.name ?? null,
            comment: registration.comment ?? null,
            spaces: registration.spaces ?? 1,
            entity_name: entity?.entity_name ?? null,
            short_name: user?.name ?? null,
            short_name_unique: user?.name ?? null,
            long_name: user?.name ?? null,
            entity,
          };
        }),
    );
  },
});
