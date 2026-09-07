import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { Grid3X3, List } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { activityDateTimeZone } from "@/utils/activity-date";
import { CancelledSignups } from "./cancelled-signups";
import { ParticipantDialog } from "./participant-dialog";
import { ParticipantGrid } from "./participant-grid";
import { ParticipantList } from "./participant-list";

function formatBookingDate(timestamp: number) {
  if (timestamp <= 0) return "Date unavailable";
  return new Date(timestamp).toLocaleString("en-GB", {
    timeZone: activityDateTimeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  activityId: Id<"activities">;
  registrationDeadline?: number;
  maxParticipants?: number;
  externallyManaged: boolean;
  canHaveManagedSignups: boolean;
  isAdmin: boolean;
  formatActivityDate: (timestamp: number) => string;
};

export function ParticipantAdminCard({
  activityId,
  registrationDeadline,
  maxParticipants,
  externallyManaged,
  canHaveManagedSignups,
  isAdmin,
  formatActivityDate,
}: Props) {
  const participants = useQuery(
    api.activityBookings.getParticipants,
    isAdmin ? { activityId } : "skip",
  );
  const cancelled = useQuery(
    api.activityBookings.getCancelledParticipants,
    isAdmin ? { activityId } : "skip",
  );
  const [view, setView] = useState<"list" | "grid">("grid");
  const [sort, setSort] = useState<"newest" | "alphabetical">("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = participants?.find((participant) => participant._id === selectedId);
  const displayed = useMemo(() => {
    if (!participants) return [];
    if (sort === "newest") return participants;
    return [...participants].sort((left, right) =>
      (left.user?.shortName ?? "Unknown").localeCompare(right.user?.shortName ?? "Unknown", "en", {
        sensitivity: "base",
      }),
    );
  }, [participants, sort]);
  const show =
    isAdmin &&
    ((participants !== undefined && participants.length > 0) ||
      (cancelled !== undefined && cancelled.length > 0) ||
      canHaveManagedSignups);
  if (!show) return null;

  return (
    <Card className="space-y-4 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            Sign-ups{participants ? ` (${participants.length})` : ""}
          </h3>
          {externallyManaged && (
            <p className="text-sm text-gray-500">
              Imported from the externally managed sign-up system.
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Control label="Sign-up order">
            <Segment active={sort === "newest"} onClick={() => setSort("newest")}>
              Newest
            </Segment>
            <Segment
              active={sort === "alphabetical"}
              onClick={() => setSort("alphabetical")}
              label="Sort alphabetically"
            >
              A–Z
            </Segment>
          </Control>
          <Control label="Sign-up view">
            <Segment
              active={view === "list"}
              onClick={() => setView("list")}
              label="Show detailed list"
            >
              <List className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">List</span>
            </Segment>
            <Segment
              active={view === "grid"}
              onClick={() => setView("grid")}
              label="Show compact grid"
            >
              <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Grid</span>
            </Segment>
          </Control>
        </div>
      </div>
      <dl className="grid gap-3 rounded-2xl bg-[#f4f8fa] p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-gray-500">Register until</dt>
          <dd className="mt-1 text-gray-900">
            {registrationDeadline ? formatActivityDate(registrationDeadline) : "Not specified"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Maximum participants</dt>
          <dd className="mt-1 text-gray-900">{maxParticipants ?? "No limit"}</dd>
        </div>
      </dl>
      {participants === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-full" />
          ))}
        </div>
      ) : participants.length === 0 ? (
        <p className="text-sm text-gray-500">No sign-ups yet.</p>
      ) : view === "list" ? (
        <ParticipantList participants={displayed} formatDate={formatBookingDate} />
      ) : (
        <ParticipantGrid participants={displayed} onSelect={setSelectedId} />
      )}
      <ParticipantDialog
        participant={selected}
        onClose={() => setSelectedId(null)}
        formatDate={formatBookingDate}
      />
      {cancelled !== undefined && (
        <CancelledSignups participants={cancelled} formatDate={formatBookingDate} />
      )}
    </Card>
  );
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="flex rounded-full border border-gray-200 bg-gray-50 p-1"
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}
function Segment({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${active ? "bg-white text-[#21526f] shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
    >
      {children}
    </button>
  );
}
