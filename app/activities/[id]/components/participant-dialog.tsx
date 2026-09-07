import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { Pencil } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ParticipantAvatar } from "./participant-display";
import { ParticipantBadges } from "./participant-list";
import type { Participant } from "./participant-types";

export function ParticipantDialog({
  participant,
  onClose,
  formatDate,
}: {
  participant?: Participant;
  onClose: () => void;
  formatDate: (timestamp: number) => string;
}) {
  const updateShortName = useMutation(api.users.updateUserShortName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setEditing(false);
    setError(null);
    onClose();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participant?.user) return;
    const shortName = draft.trim();
    if (!shortName) {
      setError("Short name cannot be empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateShortName({ id: participant.user._id, shortName });
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update short name.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(participant)}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {participant && (
        <DialogContent className="max-w-md rounded-2xl border-0 bg-white">
          <DialogHeader className="pr-8 text-left">
            <div className="flex items-center gap-3">
              <ParticipantAvatar name={participant.user?.shortName ?? "Unknown"} size="small" />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <DialogTitle>{participant.user?.shortName ?? "Unknown participant"}</DialogTitle>
                  {participant.user && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(participant.user!.shortName);
                        setError(null);
                        setEditing(true);
                      }}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-[#eaf3f7] hover:text-[#21526f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21526f]"
                      aria-label={`Edit short name for ${participant.user.shortName}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <DialogDescription className="mt-1">
                  {participant.user?.name ?? "User details unavailable"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {editing && participant.user && (
              <form
                onSubmit={submit}
                className="rounded-xl border border-[#6fa8c4]/30 bg-[#f4f8fa] p-3"
              >
                <label
                  htmlFor="participant-short-name"
                  className="text-xs font-medium uppercase tracking-wide text-gray-500"
                >
                  Short name
                </label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="participant-short-name"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={100}
                    autoFocus
                    disabled={busy}
                    aria-invalid={Boolean(error)}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !draft.trim()}
                    className="bg-[#21526f] text-white hover:bg-[#1a3f55]"
                  >
                    {busy ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setEditing(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}
              </form>
            )}
            <dl className="grid gap-3 rounded-xl bg-[#f4f8fa] p-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</dt>
                <dd className="mt-1 break-words text-gray-900">
                  {participant.user?.email || "No email address"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Signed up
                </dt>
                <dd className="mt-1 text-gray-900">{formatDate(participant.registeredAt)}</dd>
              </div>
            </dl>
            <ParticipantBadges participant={participant} />
            <div>
              <h4 className="font-semibold text-gray-900">Comment</h4>
              {participant.comment?.trim() ? (
                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-[#6fa8c4]/30 bg-[#eaf3f7] p-3 text-gray-700">
                  {participant.comment}
                </p>
              ) : (
                <p className="mt-1 text-gray-500">No comment left.</p>
              )}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
