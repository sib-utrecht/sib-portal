import { v } from "convex/values";
import { query } from "./_generated/server";

export const querySecret = query({
  args: {
    id: v.id("committees"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
export const getCommittees = query({
  handler: async (ctx) => {
    const res = await ctx.db.query("committees").collect();
    return res.sort((a, b) => a.name.localeCompare(b.name));
  },
});
