import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { User } from "../types/user";
import { requireLogin } from "./auth";

export const getUsers = query({
  args: {},
  handler: async (ctx): Promise<User[]> => {
    return await ctx.db.query("users").collect();
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
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
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, { photoPermission });
    // return await ctx.db.get("users", id);
  },
});

export const login = query({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    if (!user || user.password !== password) {
      return null;
    }
    return user;
  },
});
// export const login = action({
//     args: { email: v.string(), password: v.string() },
//     handler: async (ctx, { email, password }) => {
//         const user = await ctx.runQuery(api.users.getUserByEmail, { email });
//         if (!user || user.password !== password) return null;
//         // return user;
//         // return ctx.auth.login(async () => {
//         //     const user = await ctx.db.query("users").filter((q) => q.eq(q.field("email"), email)).first();
//         //     if (!user || user.password !== password) {
//         //         return null;
//         //     }
//         //     return user;
//         // });
//     }
// });
