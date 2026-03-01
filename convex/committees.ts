import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { requireLogin } from "./auth";

export const querySecret = internalQuery({
  args: {
    id: v.id("committees"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
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
    return res
      .filter((c) => c.members.includes(identity.conscriboId))
      .sort((a, b) => a.name.localeCompare(b.name))
      // Do not include secret in response
      .map(({ _id, _creationTime, name, members }) => ({ _id, _creationTime, name, members }));
  },
});
