"use client"
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { Car, Link } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

export default function twoFA() {
    return (
        // <RequireAuth>
        <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication Codes</h1>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="lg">
                                <a href="/">Back to dashboard</a>
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
        // </RequireAuth>
    )
}

function Content() {
    const TOAST_MS = 1800;
    const [codes, setCodes] = useState(["?"]);
    const [updated, setUpdate] = useState(false);
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
        setUpdate(true);
        const committeeIds = committees.map((c) => c._id);
        generateTokens({ ids: committeeIds }).then((res) => {
            setCodes(res.secrets);
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
            if (t >= endTime) setUpdate(false);
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
            <h1 className="text-2xl font-normal text-gray-900">Your 2FA codes</h1>

            {/* Codes List */}
            {committees === undefined ? (
                <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">Loading authentication codes...</p>
                </div>
            ) : committees.length === 0 ? (
                <div className="py-12">
                    <p className="text-center text-gray-500">No committees available.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {committees.map((committee, index) => (
                        <button
                            key={committee._id}
                            onClick={(e) => handleCopy(e, codes[index], index)}
                            className="relative w-full text-left transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-3xl"
                        >
                            {copiedToast?.index === index && (
                                    <div
                                        key={copiedToast.nonce}
                                        className="absolute bg-white border-2 border-gray-900 rounded-md px-3 py-1 text-sm text-gray-900 pointer-events-none"
                                        style={{
                                            left: copiedToast.x,
                                            top: copiedToast.y,
                                            transform: "translate(12px, -50%)",
                                            animation: `copiedFade ${TOAST_MS}ms ease-out forwards`,
                                        }}
                                    >
                                        {copiedToast.text}
                                    </div>
                                )}
                            <div className="border-2 border-gray-900 rounded-3xl px-6 py-6 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                                {/* Committee Name */}
                                <div className="text-xl font-normal text-gray-900 min-w-[100px]">
                                    {committee.name}
                                </div>
                                
                                {/* Code */}
                                <div className="font-mono text-4xl font-semibold text-gray-900 tracking-wider flex-1 text-center">
                                    {codes[index]}
                                </div>
                                
                                {/* Timer with animated circle */}
                                <div className="relative flex items-center justify-center w-12 h-12">
                                    <svg className="absolute inset-0 w-12 h-12 -rotate-90">
                                        <circle
                                            key={`${committee._id}-${resetKey}`}
                                            cx="24"
                                            cy="24"
                                            r="22"
                                            fill="none"
                                            stroke="#111827"
                                            strokeWidth="2"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={dashoffset}
                                            className="transition-none"
                                            style={{
                                                ...(isResettingCircle
                                                    ? { animation: "circleResetFill 350ms ease-out" }
                                                    : null),
                                                ["--circumference" as any]: `${circumference}`,
                                            }}
                                        />
                                    </svg>
                                    <span className="text-lg font-semibold text-gray-900 relative z-10">{secondsLeft}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
            {/* Footer Text */}
            <div className="space-y-1 text-sm text-gray-600 pt-4">
                <p>
                   Missing a committee? <a className="underline" href="mailto:secretaris@sib-utrecht.nl">
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
                <DialogContent className="w-[min(560px,calc(100vw-2rem))] border-2 border-gray-900 rounded-3xl bg-white text-gray-900 shadow-none [&>button.absolute]:hidden">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900">How do I login?</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm leading-relaxed">
                        <p>
                            Thank you for becoming a committee member! To sign in, you should have gotten an email address and password from someone. If you haven't, ask in the groupchat or directly to the chair of your committee. If you are then prompted to verify signing in using someone's phone, click "other ways" and go to 2FA code. There you can enter the code from this page.
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-end">
                        <DialogClose asChild>
                            <Button variant="secondary" className="cursor-pointer border-2 border-gray-900 bg-destructive/20 text-gray-900 hover:bg-destructive/25">
                                close
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @keyframes copiedFade {
                    0% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0;
                    }
                }

                @keyframes circleResetFill {
                    from {
                        stroke-dashoffset: var(--circumference);
                    }
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </div>
    );
}

