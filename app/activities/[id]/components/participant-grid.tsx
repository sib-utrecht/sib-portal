import { MessageCircle } from "lucide-react";
import { ParticipantAvatar } from "./participant-display";
import type { Participants } from "./participant-types";

export function ParticipantGrid({
  participants,
  onSelect,
}: {
  participants: Participants;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-x-1 gap-y-3 sm:grid-cols-5 md:grid-cols-6">
      {participants.map((participant) => {
        const shortName = participant.user?.shortName ?? "Unknown";
        const hasComment = Boolean(participant.comment?.trim());
        return (
          <button
            key={participant._id}
            type="button"
            onClick={() => onSelect(participant._id)}
            className="group flex min-w-0 flex-col items-center rounded-2xl px-0 py-2 text-center transition-colors hover:bg-[#f4f8fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21526f] focus-visible:ring-offset-2"
            aria-label={`View details for ${shortName}${hasComment ? ", has a comment" : ""}`}
          >
            <span className="relative">
              <ParticipantAvatar name={shortName} />
              {hasComment && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#e79b37] text-white shadow-sm">
                  <MessageCircle className="h-3 w-3 fill-current" aria-hidden="true" />
                </span>
              )}
            </span>
            <span className="mt-2 w-full truncate text-sm font-medium text-gray-800 group-hover:text-[#21526f]">
              {shortName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
