import type React from "react";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const TOAST_MS = 1800;

export default function TwoFAPage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-[linear-gradient(180deg,var(--color-accent)_0%,var(--color-background)_60%)]">
        <header className="bg-background shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-foreground">
                Two-Factor Authentication Codes
              </h1>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="lg">
                  <Link to="/">Back to dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-xl mx-auto">
            <Content />
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}

function Content() {
  const [codes, setCodes] = useState(["?"]);
  const [updated, setUpdated] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [resetKey, setResetKey] = useState(0);
  const [isResettingCircle, setIsResettingCircle] = useState(false);
  const [copiedToast, setCopiedToast] = useState<{
    index: number;
    x: number;
    y: number;
    nonce: number;
    text: string;
  } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const prevEndTimeRef = useRef<number | null>(null);
  const [loginHelpOpen, setLoginHelpOpen] = useState(false);
  const generateTokens = useAction(api.generateToken.generateTokens);
  const committees = useQuery(api.committees.getCommittees);

  useEffect(() => {
    if (!committees || updated) return;
    setUpdated(true);
    const committeeIds = committees.map((c) => c._id);
    generateTokens({ ids: committeeIds }).then((res) => {
      setCodes(res.codes);
      setEndTime(res.endTime);
      setNow(Date.now());
    });
  }, [committees, updated, generateTokens]);

  useEffect(() => {
    if (!endTime) return;
    const prev = prevEndTimeRef.current;
    prevEndTimeRef.current = endTime;

    if (prev !== null && Date.now() >= prev) {
      setResetKey(Date.now());
      setIsResettingCircle(true);
      if (resetTimeoutRef.current !== null) window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = window.setTimeout(() => setIsResettingCircle(false), 350);
    }

    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };
  }, [endTime]);

  useEffect(() => {
    if (!endTime) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endTime) setUpdated(false);
    }, 50);
    return () => window.clearInterval(id);
  }, [endTime]);

  const remainingMs = endTime ? Math.max(0, endTime - now) : 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingMs / 30000));
  const dashoffset = progress > 0.999 ? 0 : circumference * (1 - progress);

  const fallbackCopyText = (text: string) => {
    // Legacy fallback for non-secure contexts that lack navigator.clipboard
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  };

  const handleCopy = async (e: MouseEvent<HTMLButtonElement>, code: string, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nonce = Date.now();

    let ok = false;
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        ok = true;
      } else {
        ok = fallbackCopyText(code);
      }
    } catch {
      ok = fallbackCopyText(code);
    }

    setCopiedToast({ index, x, y, nonce, text: ok ? "Copied" : "Unable to copy" });
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setCopiedToast(null), TOAST_MS);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <h1 className="text-2xl font-normal text-foreground">Your 2FA codes</h1>

      {/* Codes List */}
      {committees === undefined ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading authentication codes...</p>
        </div>
      ) : committees.length === 0 ? (
        <div className="py-12">
          <p className="text-center text-muted-foreground">No committees available. Go join one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {committees.map((committee, index) => (
            <button
              key={committee._id}
              onClick={(e) => handleCopy(e, codes[index], index)}
              className="relative w-full text-left transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring rounded-3xl"
            >
              {copiedToast?.index === index && (
                <div
                  key={copiedToast.nonce}
                  className="absolute bg-background border-2 border-foreground rounded-md px-3 py-1 text-sm text-foreground pointer-events-none"
                  style={{
                    left: copiedToast.x,
                    top: copiedToast.y,
                    transform: "translate(12px, -50%)",
                    animation: `copied-fade ${TOAST_MS}ms ease-out forwards`,
                  }}
                >
                  {copiedToast.text}
                </div>
              )}
              <div className="border-2 border-foreground rounded-3xl px-6 py-6 bg-background hover:bg-muted transition-colors flex items-center justify-between gap-4">
                {/* Committee Name */}
                <div className="text-xl font-normal text-foreground min-w-[100px]">
                  {committee.name}
                </div>

                {/* Code */}
                <div className="font-mono text-4xl font-semibold text-foreground tracking-wider flex-1 text-center">
                  {codes[index]}
                </div>

                {/* Timer with animated circle */}
                <div className="relative flex items-center justify-center w-12 h-12">
                  <svg className="absolute inset-0 w-12 h-12 -rotate-90 text-foreground">
                    <circle
                      key={`${committee._id}-${resetKey}`}
                      cx="24"
                      cy="24"
                      r="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashoffset}
                      className="transition-none"
                      style={
                        {
                          ...(isResettingCircle
                            ? { animation: "circle-reset-fill 350ms ease-out" }
                            : null),
                          "--circumference": `${circumference}`,
                        } as React.CSSProperties
                      }
                    />
                  </svg>
                  <span className="text-lg font-semibold text-foreground relative z-10">
                    {secondsLeft}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Footer Text */}
      <div className="space-y-1 text-sm text-muted-foreground pt-4">
        <p>
          Missing a committee?{" "}
          <a className="underline" href="mailto:secretaris@sib-utrecht.nl">
            Contact the secretary
          </a>
        </p>
        <p>Interested in joining a new committee? Contact the board</p>
        <button
          type="button"
          className="underline cursor-pointer"
          onClick={() => setLoginHelpOpen(true)}
        >
          How do I login?
        </button>
      </div>

      <Dialog open={loginHelpOpen} onOpenChange={setLoginHelpOpen}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] border-2 border-foreground rounded-3xl bg-background text-foreground shadow-none [&>button.absolute]:hidden">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              How do I login?
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm leading-relaxed">
            <p>
              Thank you for becoming a committee member! To sign in, you should have gotten an email
              address and password from someone. If you haven't, ask in the groupchat or directly to
              the chair of your committee. If you are then prompted to verify signing in using
              someone's phone, click "other ways" and go to 2FA code. There you can enter the code
              from this page.
            </p>
          </div>
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button
                variant="secondary"
                className="cursor-pointer border-2 border-foreground bg-destructive/20 text-foreground hover:bg-destructive/25"
              >
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
