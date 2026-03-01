"use node";
import { authenticator } from "otplib";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireLogin } from "./auth";

// Generate tokens for a list of committee ids
export const generateTokens = action({
  args: {
    ids: v.array(v.id("committees")),
  },
  handler: async (ctx, args): Promise<{ secrets: string[]; endTime: number }> => {
    const identity = await requireLogin(ctx);

    var secrets = await Promise.all(
      args.ids.map((val) => ctx.runQuery(internal.committees.querySecret, { id: val })),
    );

    var end = Date.now() + authenticator.timeRemaining() * 1000; // date.now is in milliseconds and authenticator is in second

    return {
      secrets: secrets.map((s) => {
        if (s == null) {
          throw new Error("Invalid committee ID");
        }
        if (!s.members.includes(identity.conscriboId)) {
          throw new Error("Unauthorized: Not a member of committee " + s.name);
        }
        return authenticator.generate(s.secret);
      }),
      endTime: end,
    };
  },
});
