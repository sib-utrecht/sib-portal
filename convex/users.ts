import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { User } from "../types/user";
import { getAuthenticatedIdentity, requireAdmin } from "./auth";
import { findCurrentUser, requireCurrentUser } from "./legacy/identity";

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
 * Returns the imported profile for the currently authenticated user.
 *
 * Returns `null` when the caller is not authenticated. A valid Cognito user
 * without a matching imported record is rejected.
 */
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getAuthenticatedIdentity(ctx);
    if (!identity) return null;

    const dbUser = await findCurrentUser(ctx, identity);
    if (!dbUser || dbUser.name.trim() === "") {
      throw new Error("Forbidden: No imported member record with a name found");
    }

    return {
      _id: dbUser._id,
      name: dbUser.name,
      firstName: dbUser.firstName ?? null,
      lastName: dbUser.lastName ?? null,
      shortName: dbUser.shortName ?? null,
      email: dbUser.email,
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
    const currentUser = await requireCurrentUser(ctx);

    const user = await ctx.db.get(id);
    if (!user) {
      throw new Error("User not found");
    }

    if (user._id !== currentUser._id) {
      await requireAdmin(ctx);
    }

    await ctx.db.patch(id, { photoPermission });
  },
});

/** Update a member's short name. Admin only. */
export const updateUserShortName = mutation({
  args: {
    id: v.id("users"),
    shortName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, shortName }) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(id);
    if (!user) throw new Error("User not found");

    const normalizedShortName = shortName.trim();
    if (normalizedShortName.length === 0) {
      throw new Error("Short name cannot be empty");
    }
    if (normalizedShortName.length > 100) {
      throw new Error("Short name cannot exceed 100 characters");
    }

    await ctx.db.patch(id, {
      shortName: normalizedShortName === user.firstName?.trim() ? null : normalizedShortName,
    });
    return null;
  },
});
