import type { MutationCtx } from "../_generated/server";
import { requireLogin } from "../auth";

/**
 * Resolve a Cognito identity to a portal user while the legacy Conscribo to
 * WordPress ID convention is still needed during migration.
 */
export async function requireCurrentUser(ctx: MutationCtx) {
  const identity = await requireLogin(ctx);
  const byEmail = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email))
    .first();
  if (byEmail) return byEmail;

  const conscriboId = Number.parseInt(identity.conscriboId, 10);
  const wordpressUserId = Number.isFinite(conscriboId) ? conscriboId + 1_000 : undefined;
  const byWordpressId =
    wordpressUserId === undefined
      ? null
      : await ctx.db
          .query("users")
          .withIndex("by_legacyWordpressUserId", (q) =>
            q.eq("legacyWordpressUserId", wordpressUserId),
          )
          .first();

  if (byWordpressId) {
    if (byWordpressId.email === "") {
      await ctx.db.patch(byWordpressId._id, { email: identity.email });
    }
    return byWordpressId;
  }

  const userId = await ctx.db.insert("users", {
    name:
      identity.name ||
      [identity.givenName, identity.familyName].filter(Boolean).join(" ") ||
      identity.email,
    email: identity.email,
    role: "member",
    photoPermission: "nowhere",
    avatar: "",
    legacyEntityName: wordpressUserId === undefined ? undefined : `wp-user-${wordpressUserId}`,
    legacyWordpressUserId: wordpressUserId,
  });
  return (await ctx.db.get(userId))!;
}
