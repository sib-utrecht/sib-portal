"use node";
import { authenticator } from "otplib";
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Generate tokens for a list of committee ids
export const generateTokens = action({
  args: {
    ids: v.array(v.id("committees")),
  },
  handler: async (ctx, args): Promise<{ secrets: string[]; endTime: number }> => {
    var secrets = await Promise.all(
      args.ids.map((val) => ctx.runQuery(api.committees.querySecret, { id: val })),
    );

    var end = Date.now() + authenticator.timeRemaining() * 1000; // date.now is in milliseconds and authenticator is in second
    return { secrets: secrets.map((s) => authenticator.generate(s!.secret)), endTime: end };
  },
});
