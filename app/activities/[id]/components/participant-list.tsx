import { Badge } from "@/components/ui/badge";
import type { Participant, Participants } from "./participant-types";

export function ParticipantBadges({ participant }: { participant: Participant }) {
  return (
    <div className="flex flex-wrap gap-2">
      {participant.source === "legacy" && <Badge>Imported</Badge>}
      {participant.legacyStatus !== undefined && participant.legacyStatus !== "approved" && (
        <Badge variant="outline">{participant.legacyStatus}</Badge>
      )}
      {(participant.spaces ?? 1) > 1 && <Badge variant="outline">{participant.spaces} spots</Badge>}
    </div>
  );
}

export function ParticipantList({
  participants,
  formatDate,
}: {
  participants: Participants;
  formatDate: (timestamp: number) => string;
}) {
  return (
    <div className="space-y-2">
      {participants.map((participant) => (
        <div
          key={participant._id}
          className="space-y-2 rounded-2xl border border-[#6fa8c4]/40 bg-[#eaf3f7] px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div>
              <p className="font-semibold text-gray-900">
                {participant.user?.name ?? "(unknown user)"}
              </p>
              <p className="text-sm text-gray-600">
                {participant.user?.email || "No email address"}
              </p>
            </div>
            <ParticipantBadges participant={participant} />
          </div>
          <div className="text-xs text-gray-500">{formatDate(participant.registeredAt)}</div>
          {participant.comment && (
            <p className="whitespace-pre-wrap break-words border-t border-[#6fa8c4]/30 pt-2 text-sm text-gray-700">
              {participant.comment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
