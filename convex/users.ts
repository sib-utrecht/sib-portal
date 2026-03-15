import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { User } from "../types/user";
import { requireLogin, requireAdmin } from "./auth";

/**
 * Returns all user records in the database.
 * Requires the caller to be an admin; throws `"Forbidden"` otherwise.
 */
export const getUsers = query({
  args: {},
  handler: async (ctx): Promise<User[]> => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});

/**
 * Returns the user record matching the given email address.
 * Requires the caller to be an admin; throws `"Forbidden"` otherwise.
 *
 * @param email - The exact email address to look up.
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
  },
});

/**
 * Returns the profile for the currently authenticated user, merging data from
 * both the Cognito identity (name, email) and the Convex `users` table
 * (role, avatar, photoPermission).
 *
 * Returns `null` when the caller is not authenticated, has no email in their
 * identity token, or has no matching record in the `users` table.
 */
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) return null;

    const dbUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!dbUser) return null;

    return {
      _id: dbUser._id,
      name:
        [identity.givenName, identity.familyName].filter(Boolean).join(" ") ||
        identity.name ||
        "User",
      email: identity.email,
      role: dbUser.role,
      avatar: dbUser.avatar ?? null,
      photoPermission: dbUser.photoPermission,
    };
  },
});

/**
 * Updates the photo-permission setting for a user record.
 *
 * Members may only update their own record.  Admins may update any record.
 * Throws `"Unauthorized"` if the caller is not authenticated, `"User not found"`
 * if no record matches `id`, and `"Forbidden"` if a non-admin attempts to update
 * another user's record.
 *
 * @param id              - Convex document ID of the user to update.
 * @param photoPermission - The new photo-permission value to set.
 */
export const updateUserPhotoPermission = mutation({
  args: {
    id: v.id("users"),
    photoPermission: v.union(
      v.literal("internal+external"),
      v.literal("internal"),
      v.literal("nowhere"),
    ),
  },
  handler: async (ctx, { id, photoPermission }) => {
    const identity = await requireLogin(ctx);

    const user = await ctx.db.get(id);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.email !== identity.email) {
      await requireAdmin(ctx);
    }

    await ctx.db.patch(id, { photoPermission });
  },
});
