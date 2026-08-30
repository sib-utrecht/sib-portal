"use node";
import { generate } from "otplib";
import { v } from "convex/values";
import { action } from "./_generated/server";
import type { FunctionReturnType } from "convex/server";
import { internal } from "./_generated/api";
import { requireLogin } from "./auth";

/**
 * Generates TOTP 2FA codes for one or more committees, used by members to log
 * in to the Google account of each committee.
 *
 * For each committee ID the caller must be an authenticated member of that
 * committee (verified via their Conscribo ID).  The TOTP secrets are fetched
 * server-side via the internal `committees.querySecret` query and are never
 * exposed to the client.
 *
 * @param ids - Array of Convex committee document IDs to generate codes for.
 * @returns An object containing:
 * - `codes` — TOTP codes in the same order as the input `ids`.
 * - `endTime`  — Unix timestamp (milliseconds) when the current TOTP window expires.
 *
 * @throws If any ID is invalid or the caller is not a member of the committee.
 */
export const generateTokens = action({
  args: {
    ids: v.array(v.id("committees")),
  },
  handler: async (ctx, args): Promise<{ codes: string[]; endTime: number }> => {
    const identity = await requireLogin(ctx);

    const secrets: Array<FunctionReturnType<typeof internal.committees.querySecret>> = [];
    for (const val of args.ids) {
      secrets.push(await ctx.runQuery(internal.committees.querySecret, { id: val }));
    }

    const periodSeconds = 30;
    const end = (Math.floor(Date.now() / 1000 / periodSeconds) + 1) * periodSeconds * 1000;

    return {
      codes: await Promise.all(
        secrets.map(async (s) => {
          if (s == null) {
            throw new Error("Invalid committee ID");
          }
          if (!s.members.includes(identity.conscriboId)) {
            throw new Error("Unauthorized: Not a member of committee " + s.name);
          }
          return await generate({ secret: s.secret });
        }),
      ),
      endTime: end,
    };
  },
});
