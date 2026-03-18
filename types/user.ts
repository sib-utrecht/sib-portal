/**
 * Controls where the organization is allowed to use photos of this member.
 * - `"internal+external"`: photos may be used in both internal communications and external marketing.
 * - `"internal"`: photos may only be used for internal communications.
 * - `"nowhere"`: photos must not be used anywhere.
 */
export type PhotoPermission = "internal+external" | "internal" | "nowhere";

/** A member or administrator record as stored in the Convex database. */
export interface User {
  /** Convex document ID. */
  _id: string;
  /** Full display name. */
  name: string;
  /** Email address used for login and communications. */
  email: string;
  /** Access level; admins can view and manage all members. */
  role: "member" | "admin";
  /** The member's current photo-usage consent level. */
  photoPermission: PhotoPermission;
  /** URL of the member's profile avatar image, if set. */
  avatar?: string;
}

/** Snapshot of the current authentication state used across the app. */
export interface AuthState {
  /** The currently signed-in user, or `null` when not authenticated. */
  user: User | null;
  /** Whether a user is currently signed in. */
  isAuthenticated: boolean;
}
