import { httpRouter } from "convex/server";
import type { FunctionReturnType } from "convex/server";
import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthenticatedIdentity } from "../auth";

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Id-Token, X-App-Version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected API error";
  const normalized = message.toLowerCase();
  let status = 400;
  if (normalized.includes("unauthorized")) status = 401;
  if (normalized.includes("forbidden")) status = 403;
  if (normalized.includes("not found")) status = 404;
  return json({ error: message, message }, status);
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

type PublicActivity = FunctionReturnType<typeof internal.legacy.activityApi.listActivities>[number];

function asV2Signup(activity: PublicActivity) {
  const apiSignup = activity.allowSignup || activity.legacySignupMethod === "api";
  if (apiSignup) {
    return {
      method: "api",
      ...(activity.registrationDeadline
        ? { end: new Date(activity.registrationDeadline).toISOString() }
        : {}),
      ...(activity.maxParticipants !== undefined ? { spaces: activity.maxParticipants } : {}),
      occupied: activity.participantCount,
      available:
        Date.now() <= (activity.registrationDeadline ?? activity.startTime) &&
        (activity.maxParticipants === undefined ||
          activity.participantCount < activity.maxParticipants),
    };
  }
  if (activity.externalSignupUrl) return { method: "url", url: activity.externalSignupUrl };
  return "none";
}

function asV2Event(activity: PublicActivity) {
  const hasEnd = activity.endTime !== activity.startTime;
  return {
    id: activity.id,
    name: { long: activity.title },
    date: {
      start: new Date(activity.startTime).toISOString(),
      end: hasEnd ? new Date(activity.endTime).toISOString() : null,
    },
    location: activity.location ?? null,
    organizer: null,
    body: {
      description: { html: activity.description },
      image: activity.promotionalImage ?? null,
    },
    participate: { signup: asV2Signup(activity) },
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
  const activities = await ctx.runQuery(internal.legacy.activityApi.listActivities, {
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
  const participantsMatch = url.pathname.match(
    /^\/(?:api\/)?v2\/events\/([^/]+)\/participants\/?$/,
  );
  if (participantsMatch) {
    try {
      const activity = await ctx.runQuery(internal.legacy.activityApi.getActivity, {
        id: decodeURIComponent(participantsMatch[1]),
      });
      if (!activity) return json({ error: "Activity not found" }, 404);
      const participants = await ctx.runQuery(internal.legacy.activityApi.listParticipants, {
        activityId: activity.convexId,
      });
      return json({ data: { participants } });
    } catch (error) {
      return errorResponse(error);
    }
  }
  const match = url.pathname.match(/^\/(?:api\/)?(v2\/events|v3\/activities)\/([^/]+)$/);
  if (!match) return json({ error: "Not found" }, 404);
  const activity = await ctx.runQuery(internal.legacy.activityApi.getActivity, {
    id: decodeURIComponent(match[2]),
  });
  if (!activity) return json({ error: "Activity not found" }, 404);
  return json(
    match[1] === "v2/events"
      ? { data: { event: asV2Event(activity) } }
      : { data: { activity: asV3Activity(activity) } },
  );
});

const listMyBookings = httpAction(async (ctx) => {
  try {
    if (!(await getAuthenticatedIdentity(ctx))) {
      return json({ data: { bookings: [], auth_userid: null } });
    }
    const bookings = await ctx.runQuery(internal.legacy.bookingApi.listCurrentUserBookings, {});
    return json({
      data: {
        bookings: bookings.map((booking) => ({
          event_id: booking.eventId,
          user_comment: booking.comment ?? null,
          spaces: booking.spaces,
          booking_date:
            booking.registeredAt > 0 ? new Date(booking.registeredAt).toISOString() : null,
          status: booking.status,
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

const addMyBooking = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const activityIdentifier = url.searchParams.get("event_id");
    if (!activityIdentifier) return json({ error: "Missing parameter: event_id" }, 400);
    const body: unknown = await request.json().catch(() => null);
    if (body !== null && (typeof body !== "object" || Array.isArray(body))) {
      return json({ error: "Expected a JSON object" }, 400);
    }
    const commentValue = body ? (body as Record<string, unknown>).booking_comment : undefined;
    if (commentValue !== undefined && commentValue !== null && typeof commentValue !== "string") {
      return json({ error: "booking_comment must be a string or null" }, 400);
    }
    if (typeof commentValue === "string" && commentValue.length > 2_000) {
      return json({ error: "booking_comment must be at most 2000 characters" }, 400);
    }
    const bookingId = await ctx.runMutation(internal.legacy.bookingApi.addBooking, {
      activityIdentifier,
      comment: typeof commentValue === "string" ? commentValue : undefined,
    });
    return json({ status: "success", data: { booking_id: bookingId } });
  } catch (error) {
    return errorResponse(error);
  }
});

const removeMyBooking = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const match = url.pathname.match(
    /^\/(?:api\/)?v2\/users\/me\/bookings\/by-event-id\/([^/]+)\/?$/,
  );
  if (!match) return json({ error: "Not found" }, 404);
  try {
    await ctx.runMutation(internal.legacy.bookingApi.removeBooking, {
      activityIdentifier: decodeURIComponent(match[1]),
    });
    return json({ status: "success" });
  } catch (error) {
    return errorResponse(error);
  }
});

const corsPreflight = httpAction(
  async () => new Response(null, { status: 204, headers: jsonHeaders }),
);


export function registerLegacyRoutes(http: ReturnType<typeof httpRouter>) {
  http.route({ path: "/v2/events", method: "GET", handler: listActivities });
  http.route({ pathPrefix: "/v2/events/", method: "GET", handler: getActivity });
  http.route({ path: "/v3/activities", method: "GET", handler: listActivities });
  http.route({ pathPrefix: "/v3/activities/", method: "GET", handler: getActivity });
  http.route({ path: "/v2/users/me/bookings", method: "GET", handler: listMyBookings });
  http.route({ path: "/v2/users/me/bookings", method: "POST", handler: addMyBooking });
  http.route({ path: "/v2/users/me/bookings/", method: "POST", handler: addMyBooking });
  http.route({
    pathPrefix: "/v2/users/me/bookings/by-event-id/",
    method: "DELETE",
    handler: removeMyBooking,
  });
  http.route({ pathPrefix: "/v2/", method: "OPTIONS", handler: corsPreflight });
}
