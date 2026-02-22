import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { User } from "../types/user";
import { requireLogin, isAdmin } from "./auth";

export const getUsers = query({
  args: {},
  handler: async (ctx): Promise<User[]> => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Forbidden: Admin privileges required");
    }
    return await ctx.db.query("users").collect();
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Forbidden: Admin privileges required");
    }
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireLogin(ctx);

    const dbUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email ?? ""))
      .first();

    return {
      name:
        [identity.givenName, identity.familyName].filter(Boolean).join(" ") ||
        identity.name ||
        "User",
      email: identity.email ?? "",
      role: dbUser?.role ?? "member",
      avatar: dbUser?.avatar ?? null,
    };
  },
});

export const updateUserPhotoPermission = mutation({
  args: {
    id: v.string(),
    photoPermission: v.union(
      v.literal("internal+external"),
      v.literal("internal"),
      v.literal("nowhere"),
    ),
  },
  handler: async (ctx, { id, photoPermission }) => {
    const identity = await requireLogin(ctx);

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    if (!user) {
      throw new Error("User not found");
    }

    if (user.email !== identity.email) {
      if (!(await isAdmin(ctx))) {
        throw new Error("Forbidden: Admin privileges required");
      }
    }

    await ctx.db.patch(user._id, { photoPermission });
  },
});
