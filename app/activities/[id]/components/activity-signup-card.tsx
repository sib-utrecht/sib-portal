import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { AlertTriangle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityStatus } from "./activity-types";

class SignupErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Activity sign-up failed to render:", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const needsActivation = this.state.error.message.includes(
      "No imported member record with a name found",
    );
    return (
      <Card className="rounded-2xl p-6 shadow-sm shadow-[#21526f]/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#21526f]" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-gray-900">
              {needsActivation ? "Your account still needs to be activated" : "Sign-up unavailable"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {needsActivation
                ? "You are signed in, but your membership has not been activated in the portal yet. Please contact the board before signing up for this activity."
                : "We couldn’t load the sign-up options. Please try again later."}
            </p>
          </div>
        </div>
      </Card>
    );
  }
}

type Props = {
  activityId: Id<"activities">;
  status?: ActivityStatus;
  authLoading: boolean;
  authenticated: boolean;
  registrationOpen: boolean;
  deregistrationOpen: boolean;
  maxParticipants?: number;
  registrationDeadline?: number;
  loginUrl: string;
  formatDate: (timestamp: number) => string;
};

export function ActivitySignupCard(props: Props) {
  const register = useMutation(api.activityBookings.registerForActivity);
  const unregister = useMutation(api.activityBookings.unregisterFromActivity);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const isFull =
    props.maxParticipants !== undefined &&
    (props.status?.participantCount ?? 0) >= props.maxParticipants;

  async function signUp() {
    setBusy(true);
    setError(null);
    try {
      await register({ activityId: props.activityId, comment: comment || undefined });
      setComment("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await unregister({ activityId: props.activityId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SignupErrorBoundary>
      <Card className="space-y-3 rounded-2xl p-6 shadow-sm shadow-[#21526f]/5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#21526f]" />
            <h3 className="text-lg font-semibold">Sign up</h3>
          </div>
          {((props.maxParticipants !== undefined && props.status) ||
            props.registrationDeadline) && (
            <div className="space-y-1 text-sm text-gray-600">
              {props.maxParticipants !== undefined && props.status && (
                <p>
                  {props.status.participantCount} / {props.maxParticipants} spots filled
                </p>
              )}
              {props.registrationDeadline && (
                <p>Register until: {props.formatDate(props.registrationDeadline)}</p>
              )}
            </div>
          )}
        </div>
        {props.status?.needsActivation ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              <span className="font-medium">Your account still needs to be activated.</span> You are
              signed in, but your membership has not been activated in the portal yet. Please
              contact the board before signing up for this activity.
            </AlertDescription>
          </Alert>
        ) : (
          error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )
        )}
        {props.status?.needsActivation ? null : props.authLoading ||
          (props.authenticated && props.status === undefined) ? (
          <Skeleton className="h-9 w-36 rounded-full" />
        ) : !props.authenticated ? (
          props.registrationOpen ? (
            <Button asChild className="rounded-full bg-[#21526f] text-white hover:bg-[#1a3f55]">
              <Link to={props.loginUrl}>Log in to sign up</Link>
            </Button>
          ) : (
            <p className="text-sm text-gray-500">Registration is closed.</p>
          )
        ) : props.status?.isRegistered ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="font-medium text-green-700">You are signed up</span>
              {props.deregistrationOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={cancel}
                  disabled={busy}
                >
                  Cancel sign-up
                </Button>
              )}
            </div>
            {props.status.comment && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">Your comment</p>
                <p className="whitespace-pre-wrap break-words rounded-md bg-[#f4f8fa] px-3 py-2 text-sm text-gray-700">
                  {props.status.comment}
                </p>
              </div>
            )}
          </div>
        ) : props.registrationOpen && !isFull ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="signup-comment" className="text-sm font-medium text-gray-700">
                Comment (optional)
              </label>
              <textarea
                id="signup-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                disabled={busy}
                className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs outline-none placeholder:text-gray-400 focus:border-[#21526f] focus:ring-2 focus:ring-[#21526f]/20 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add a comment"
              />
            </div>
            <Button
              className="rounded-full bg-[#21526f] text-white hover:bg-[#1a3f55]"
              onClick={signUp}
              disabled={busy}
            >
              {busy ? "Processing…" : "Sign up"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {isFull ? "Activity is full." : "Registration is closed."}
          </p>
        )}
      </Card>
    </SignupErrorBoundary>
  );
}
