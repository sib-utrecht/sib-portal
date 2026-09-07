import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type Activity = NonNullable<FunctionReturnType<typeof api.activities.getActivity>>;
export type ActivityStatus = NonNullable<
  FunctionReturnType<typeof api.activityBookings.getActivityStatus>
>;
