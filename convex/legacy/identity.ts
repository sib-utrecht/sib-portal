import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireLogin, type AuthenticatedIdentity } from "../auth";

/** Resolve a validated Cognito identity to an imported portal user. */
export async function findCurrentUser(
  ctx: QueryCtx | MutationCtx,
  identity: AuthenticatedIdentity,
) {
  if (identity.entityId) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_legacyEntityName", (q) => q.eq("legacyEntityName", identity.entityId))
      .first();
    if (user) return user;
  }

  if (identity.wordpressUserId !== undefined) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_legacyWordpressUserId", (q) =>
        q.eq("legacyWordpressUserId", identity.wordpressUserId),
      )
      .first();
    if (user) return user;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email))
    .first();
}

/** Require the caller to have a user record created by the legacy backfill. */
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await requireLogin(ctx);
  const user = await findCurrentUser(ctx, identity);
  if (!user || user.name.trim() === "") {
    throw new Error("Forbidden: No imported member record with a name found");
  }
  return user;
}
