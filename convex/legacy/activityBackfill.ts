import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { uniqueActivitySlug } from "../activities";

type SignupMethod = "none" | "api" | "url";
type ApiEventSignup =
  | "none"
  | {
      method: string;
      url?: string;
      end?: string;
      spaces?: number;
    };

type ApiEvent = {
  id: string;
  name: { long: string };
  date: { start: string; end?: string };
  location: string | null;
  body: {
    description: { html: string };
    image?: string | null;
  };
  participate: { signup: ApiEventSignup };
};

function signupMethod(signup: ApiEventSignup): SignupMethod {
  if (signup === "none") return "none";
  if (signup.method === "api" || signup.method === "url") return signup.method;
  return "none";
}

function optionalTimestamp(value: string | undefined) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/** Insert or refresh one activity imported from the legacy API. */
export const upsertActivity = internalMutation({
  args: {
    externalId: v.string(),
    title: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    description: v.string(),
    promotionalImageUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    registrationDeadline: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
    externalSignupUrl: v.optional(v.string()),
    legacySignupMethod: v.union(v.literal("none"), v.literal("api"), v.literal("url")),
  },
  returns: v.object({ id: v.id("activities"), inserted: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("activities")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        location: existing.location ?? args.location,
        registrationDeadline: existing.registrationDeadline ?? args.registrationDeadline,
        maxParticipants: existing.maxParticipants ?? args.maxParticipants,
        legacySignupMethod: args.legacySignupMethod,
        externalSignupUrl: args.externalSignupUrl,
      });
      return { id: existing._id, inserted: false };
    }

    const id = await ctx.db.insert("activities", {
      externalId: args.externalId,
      title: args.title,
      slug: await uniqueActivitySlug(ctx, args.title, args.startTime),
      startTime: args.startTime,
      endTime: args.endTime ?? args.startTime,
      description: args.description,
      promotionalImageUrl: args.promotionalImageUrl,
      location: args.location,
      allowSignup: false,
      registrationDeadline: args.registrationDeadline,
      maxParticipants: args.maxParticipants,
      externalSignupUrl: args.externalSignupUrl,
      legacySignupMethod: args.legacySignupMethod,
    });
    return { id, inserted: true };
  },
});

/** Fetch a bounded page of activities from the legacy source of truth. */
export const backfillActivities = internalAction({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  returns: v.object({ fetched: v.number(), inserted: v.number(), skipped: v.number() }),
  handler: async (ctx, { limit = 50, offset = 0 }) => {
    const url = `https://api2.sib-utrecht.nl/v2/events?limit=${limit}&offset=${offset}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as { data: { events: ApiEvent[] } };
    const events = json.data.events;

    let inserted = 0;
    let skipped = 0;
    for (const event of events) {
      const signup = event.participate.signup;
      const result = await ctx.runMutation(internal.legacy.activityBackfill.upsertActivity, {
        externalId: event.id,
        title: event.name.long,
        startTime: new Date(event.date.start).getTime(),
        endTime: optionalTimestamp(event.date.end),
        description: event.body.description.html,
        promotionalImageUrl: event.body.image ?? undefined,
        location: event.location ?? undefined,
        registrationDeadline: signup === "none" ? undefined : optionalTimestamp(signup.end),
        maxParticipants: signup === "none" ? undefined : signup.spaces,
        externalSignupUrl: signup === "none" ? undefined : signup.url,
        legacySignupMethod: signupMethod(signup),
      });
      if (result.inserted) {
        inserted++;
      } else {
        skipped++;
      }
    }

    return { fetched: events.length, inserted, skipped };
  },
});
