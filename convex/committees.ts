import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireLogin } from "./auth";

export const querySecret = query({
    args: {
        id: v.id("committees")
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .get(args.id)
    }
})
export const getCommittees = query({
    handler: async (ctx) => {
        const identity = await requireLogin(ctx);
        const res = await ctx.db.query("committees").collect();
        console.log(res)
        return res.filter(c => c.members.includes(identity["custom:conscribo-id"] as string)).sort((a, b) => a.name.localeCompare(b.name));
    }
})
