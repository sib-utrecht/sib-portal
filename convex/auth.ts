import { env, type QueryCtx, type MutationCtx, type ActionCtx } from "./_generated/server";

/**
 * Normalised representation of a successfully authenticated Cognito identity,
 * returned by {@link requireLogin} after stripping SDK-specific fields.
 */
export type AuthenticatedIdentity = {
  /** Stable identifier for this issuer and Cognito subject. */
  tokenIdentifier: string;
  /** Primary email address from the Cognito access token. */
  email: string;
  /** The member's Conscribo ID. */
  conscriboId?: string;
  /** Stable entity identifier used by the legacy API. */
  entityId?: string | undefined;
  /** WordPress user ID used by the legacy API. */
  wordpressUserId?: number | undefined;
  /** Cognito groups used for application authorization. */
  groups: string[];
};

type AuthCtx = QueryCtx | MutationCtx | ActionCtx;

/** Return a validated Cognito access-token identity, or null when unauthenticated. */
export async function getAuthenticatedIdentity(
  ctx: AuthCtx,
): Promise<AuthenticatedIdentity | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const claims = identity as Record<string, unknown>;
  if (claims.token_use !== "access" || claims.client_id !== env.COGNITO_CLIENT_ID) {
    return null;
  }
  if (!identity.email) return null;

  const conscriboId = claims["conscribo-id"];
  if (conscriboId !== undefined && typeof conscriboId !== "string") return null;

  const entityId = claims["entity-id"];
  const groups = Array.isArray(claims["cognito:groups"])
    ? claims["cognito:groups"].filter((group): group is string => typeof group === "string")
    : [];
  const rawWordpressUserId = claims["wp-userid"];
  const wordpressUserId =
    typeof rawWordpressUserId === "string" ? Number.parseInt(rawWordpressUserId, 10) : undefined;

  return {
    tokenIdentifier: identity.tokenIdentifier,
    email: identity.email,
    conscriboId,
    entityId: typeof entityId === "string" && entityId !== "" ? entityId : undefined,
    wordpressUserId:
      wordpressUserId !== undefined && Number.isFinite(wordpressUserId)
        ? wordpressUserId
        : undefined,
    groups,
  };
}

/**
 * Check if the current user is authenticated.
 * Throws an error if the user is not authenticated.
 * Returns the user's identity if authenticated.
 */
export async function requireLogin(ctx: AuthCtx): Promise<AuthenticatedIdentity> {
  const identity = await getAuthenticatedIdentity(ctx);
  if (!identity) throw new Error("Unauthorized: Valid Cognito access token required");
  return identity;
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
    const identity = await getAuthenticatedIdentity(ctx);
    if (!identity) return false;
    return identity.groups.includes("admins");
  } catch {
    return false;
  }
}
