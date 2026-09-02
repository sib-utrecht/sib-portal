import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Find an activity using either its legacy external ID or native Convex ID. */
export async function findActivity(ctx: QueryCtx | MutationCtx, identifier: string) {
  const external = await ctx.db
    .query("activities")
    .withIndex("by_externalId", (q) => q.eq("externalId", identifier))
    .first();
  if (external) return external;
  const convexId = ctx.db.normalizeId("activities", identifier);
  return convexId ? await ctx.db.get(convexId) : null;
}
