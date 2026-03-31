import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { requireLogin } from "./auth";

/**
 * Internal query that returns the full committee record including its TOTP secret.
 * Only callable from other Convex functions via `internal.committees.querySecret`;
 * the secret is never exposed directly to clients.
 *
 * @param id - Convex document ID of the committee to fetch.
 */
export const querySecret = internalQuery({
  args: {
    id: v.id("committees"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Returns all committees that the currently authenticated user belongs to,
 * sorted alphabetically by name.  The `secret` field is intentionally excluded
 * from the response to prevent TOTP secrets from leaking to clients; use
 * `generateToken.generateTokens` to obtain the actual 2FA codes.
 *
 * Requires the caller to be authenticated; throws `"Unauthorized"` otherwise.
 * Membership is determined by matching the caller's Conscribo ID against each
 * committee's `members` array.
 */
export const getCommittees = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("committees"),
      _creationTime: v.number(),
      name: v.string(),
      members: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await requireLogin(ctx);
    const res = await ctx.db.query("committees").collect();
    return (
      res
        .filter((c) => c.members.includes(identity.conscriboId))
        .sort((a, b) => a.name.localeCompare(b.name))
        // Do not include secret in response
        .map(({ _id, _creationTime, name, members }) => ({ _id, _creationTime, name, members }))
    );
  },
});
