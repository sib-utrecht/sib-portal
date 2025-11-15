import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.string(),
        email: v.string(),
        password: v.string(),
        role: v.union(v.literal("admin"), v.literal("member")),
        photoPermission: v.union(v.literal("internal+external"), v.literal("internal"), v.literal("nowhere")),
        avatar: v.string(),
    }),
});
