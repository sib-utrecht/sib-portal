/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as activityBookings from "../activityBookings.js";
import type * as auth from "../auth.js";
import type * as committees from "../committees.js";
import type * as crons from "../crons.js";
import type * as generateToken from "../generateToken.js";
import type * as http from "../http.js";
import type * as legacy_activityBackfill from "../legacy/activityBackfill.js";
import type * as legacy_activityApi from "../legacy/activityApi.js";
import type * as legacy_activityLookup from "../legacy/activityLookup.js";
import type * as legacy_bookingApi from "../legacy/bookingApi.js";
import type * as legacy_http from "../legacy/http.js";
import type * as legacy_identity from "../legacy/identity.js";
import type * as legacy_userBackfill from "../legacy/userBackfill.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  activityBookings: typeof activityBookings;
  auth: typeof auth;
  committees: typeof committees;
  crons: typeof crons;
  generateToken: typeof generateToken;
  http: typeof http;
  "legacy/activityBackfill": typeof legacy_activityBackfill;
  "legacy/activityApi": typeof legacy_activityApi;
  "legacy/activityLookup": typeof legacy_activityLookup;
  "legacy/bookingApi": typeof legacy_bookingApi;
  "legacy/http": typeof legacy_http;
  "legacy/identity": typeof legacy_identity;
  "legacy/userBackfill": typeof legacy_userBackfill;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
