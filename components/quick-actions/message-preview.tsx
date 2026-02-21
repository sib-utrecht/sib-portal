"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MessagePreviewProps {
  subject: string;
  to: string;
  replyTo?: string | null;
  className?: string;
  children: ReactNode;
}

/**
 * Generic wrapper that renders an email-like preview layout with headers
 * and a bordered body area containing arbitrary children.
 */
export function MessagePreview({ subject, to, replyTo, className, children }: MessagePreviewProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-sm">
        {replyTo && (
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <span className="font-medium">Reply-To:</span>
            <span className="text-muted-foreground">{replyTo}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <span className="font-medium">To:</span>
          <span className="text-muted-foreground">{to}</span>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <span className="font-medium">Subject:</span>
          <span className="text-muted-foreground">{subject}</span>
        </div>
      </div>
      <div className="rounded-md border bg-background p-4 text-sm space-y-3 bg-muted/30">
        {children}
      </div>
    </div>
  );
}
