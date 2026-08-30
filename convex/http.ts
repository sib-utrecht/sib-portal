import { httpRouter } from "convex/server";
import type { FunctionReturnType } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function parseDate(value: string | null, now = new Date()): number | undefined {
  if (!value) return undefined;
  const relativeDates: Record<string, Date> = {
    yesterday: new Date(now.getTime() - 86_400_000),
    today: now,
    tomorrow: new Date(now.getTime() + 86_400_000),
  };
  const date = relativeDates[value] ?? new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (relativeDates[value]) date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function boundedInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), maximum) : fallback;
}

type PublicActivity = FunctionReturnType<typeof internal.activities.listForPublicApi>[number];

function asV2Event(activity: PublicActivity) {
  const signup = activity.externalSignupUrl
    ? { method: "url", url: activity.externalSignupUrl }
    : activity.allowSignup
      ? {
          method: "api",
          ...(activity.registrationDeadline
            ? { end: new Date(activity.registrationDeadline).toISOString() }
            : {}),
          ...(activity.maxParticipants !== undefined ? { spaces: activity.maxParticipants } : {}),
        }
      : "none";
  return {
    id: activity.id,
    name: { long: activity.title },
    date: {
      start: new Date(activity.startTime).toISOString(),
      end: new Date(activity.endTime).toISOString(),
    },
    location: activity.location ?? null,
    organizer: null,
    body: {
      description: { html: activity.description },
      image: activity.promotionalImage ?? null,
    },
    participate: { signup },
  };
}

function asV3Activity(activity: PublicActivity) {
  const { id: legacyId, convexId: id, ...fields } = activity;
  return { id, legacyId, ...fields };
}

const listActivities = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const afterValue = url.searchParams.get("after") ?? url.searchParams.get("minDate");
  const after = parseDate(afterValue);
  const before = parseDate(url.searchParams.get("before"));
  if (
    (afterValue && after === undefined) ||
    (url.searchParams.has("before") && before === undefined)
  ) {
    return json(
      { error: "Invalid date; expected an ISO date, yesterday, today, or tomorrow" },
      400,
    );
  }
  const descending = url.searchParams.has("descending")
    ? url.searchParams.get("descending") !== "false"
    : after === undefined;
  const offset = boundedInteger(url.searchParams.get("offset"), 0, 1_000);
  const limit = boundedInteger(
    url.searchParams.get("limit") ?? url.searchParams.get("count"),
    40,
    100,
  );
  const activities = await ctx.runQuery(internal.activities.listForPublicApi, {
    after,
    before,
    descending,
    offset,
    limit,
  });
  // The app-level `httpPrefix: "/api"` is present in the public request URL,
  // even though routes in this file are registered without that prefix.
  const isV2 = url.pathname === "/api/v2/events" || url.pathname === "/v2/events";
  return json(
    isV2
      ? { data: { events: activities.map(asV2Event), earliest_complete_date: null } }
      : { data: { activities: activities.map(asV3Activity) } },
  );
});

const getActivity = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/(?:api\/)?(v2\/events|v3\/activities)\/([^/]+)$/);
  if (!match) return json({ error: "Not found" }, 404);
  const activity = await ctx.runQuery(internal.activities.getForPublicApi, {
    id: decodeURIComponent(match[2]),
  });
  if (!activity) return json({ error: "Activity not found" }, 404);
  return json(
    match[1] === "v2/events"
      ? { data: { event: asV2Event(activity) } }
      : { data: { activity: asV3Activity(activity) } },
  );
});

http.route({ path: "/v2/events", method: "GET", handler: listActivities });
http.route({ pathPrefix: "/v2/events/", method: "GET", handler: getActivity });
http.route({ path: "/v3/activities", method: "GET", handler: listActivities });
http.route({ pathPrefix: "/v3/activities/", method: "GET", handler: getActivity });

export default http;
