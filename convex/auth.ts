import type { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

/**
 * Normalised representation of a successfully authenticated Cognito identity,
 * returned by {@link requireLogin} after stripping SDK-specific fields.
 */
export type AuthenticatedIdentity = {
  /** Primary email address from the Cognito identity token. */
  email: string;
  /** Full display name, if present in the identity token. */
  name: string | undefined;
  /** Given (first) name, if present in the identity token. */
  givenName: string | undefined;
  /** Family (last) name, if present in the identity token. */
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

  const conscriboId = (identity as Record<string, unknown>)["custom:conscribo-id"];
  if (typeof conscriboId !== "string" || conscriboId === "") {
    throw new Error("Unauthorized: Identity is missing a valid conscribo-id claim");
  }

  return {
    email: identity.email,
    name: identity.name,
    givenName: identity.givenName,
    familyName: identity.familyName,
    conscriboId,
  };
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

    const rawGroups = (identity as Record<string, unknown>)["cognito:groups"];
    const groups = Array.isArray(rawGroups) ? rawGroups : [];
    return groups.includes("admins");
  } catch {
    return false;
  }
}
