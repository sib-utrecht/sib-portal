import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type Participants = FunctionReturnType<typeof api.activityBookings.getParticipants>;
export type Participant = Participants[number];
export type CancelledParticipants = FunctionReturnType<
  typeof api.activityBookings.getCancelledParticipants
>;
