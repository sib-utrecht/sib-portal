import type { CancelledParticipants } from "./participant-types";

export function CancelledSignups({
  participants,
  formatDate,
}: {
  participants: CancelledParticipants;
  formatDate: (timestamp: number) => string;
}) {
  if (participants.length === 0) return null;
  return (
    <details className="group rounded-2xl border border-dashed border-gray-300 bg-gray-50/80">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
        <span>Cancelled sign-ups ({participants.length})</span>
        <span className="text-xs font-normal text-gray-500 group-open:hidden">Show history</span>
        <span className="hidden text-xs font-normal text-gray-500 group-open:inline">
          Hide history
        </span>
      </summary>
      <div className="space-y-2 border-t border-gray-200 px-4 py-4">
        <p className="text-xs text-gray-500">
          Former registrations, ordered by the most recent cancellation.
        </p>
        {participants.map((participant) => (
          <div
            key={participant._id}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-600"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <div>
                <p className="font-medium text-gray-800">
                  {participant.user?.name ?? "(unknown user)"}
                </p>
                <p className="text-sm">{participant.user?.email || "No email address"}</p>
              </div>
              {participant.legacyStatus !== undefined &&
                participant.legacyStatus !== "cancelled" && (
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                    {participant.legacyStatus}
                  </span>
                )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {participant.cancelledAt
                ? `Cancelled ${formatDate(participant.cancelledAt)}`
                : "Cancellation time unavailable"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Signed up {formatDate(participant.registeredAt)}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}
