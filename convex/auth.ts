import type { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

export type AuthenticatedIdentity = {
  email: string;
  name: string | undefined;
  givenName: string | undefined;
  familyName: string | undefined;
  /** The member's Conscribo ID, sourced from the `custom:conscribo-id` JWT claim. */
  conscriboId: string;
};

/**
 * Check if the current user is authenticated.
 * Throws an error if the user is not authenticated.
 * Returns the user's identity if authenticated.
 */
export async function requireLogin(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<AuthenticatedIdentity> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthorized: Must be logged in");
  }
  if (!identity.email) {
    throw new Error("Unauthorized: Identity has no email address");
  }

  return {
    email: identity.email,
    name: identity.name,
    givenName: identity.givenName,
    familyName: identity.familyName,
    conscriboId: (identity as Record<string, unknown>)["custom:conscribo-id"] as string,
  };

  // const groups = (identity as any)["cognito:groups"] || [];
  // if (!groups.includes("admins")) {
  //     throw new Error("Forbidden: Admin privileges required");
  // }
}

/**
 * Check if the current user is authenticated and is a member of the "admins" group.
 * Throws an error if the user is not an admin.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  if (!(await isAdmin(ctx))) {
    throw new Error("Forbidden: Admin privileges required");
  }
}

/**
 * Check if the current user is authenticated and is a member of the "admins" group.
 * Returns true if admin, false otherwise.
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const groups = (identity as any)["cognito:groups"] || [];
    return groups.includes("admins");
  } catch {
    return false;
  }
}
