"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessagePreview } from "@/components/quick-actions/message-preview";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Dialog content for requesting an email-address change.
 *
 * Pre-populates the new-email field with the member's current address fetched
 * from the Convex `getProfile` query.  Submitting the form sends a request
 * email to the secretary at `info@sib-utrecht.nl`; the change is not applied
 * automatically.
 */
export function ChangeEmailDialog() {
  const profile = useQuery(api.users.getProfile);
  const [emailDraft, setEmailDraft] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty && profile !== undefined) {
      setEmailDraft(profile?.email ?? "");
    }
  }, [profile, isDirty]);

  if (profile === undefined) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Change e-mail address</DialogTitle>
          <DialogDescription>
            This will send a message to the secretary who will process your request.
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
          <Button disabled>Send request</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Change e-mail address</DialogTitle>
        <DialogDescription>
          This will send a message to the secretary who will process your request.
        </DialogDescription>
      </DialogHeader>
      <MessagePreview
        subject="Request: Change of e-mail address"
        to="info@sib-utrecht.nl"
        replyTo={profile?.email}
      >
        <p>Hi,</p>
        <p>I would like to update my account e-mail address.</p>
        <div>
          <Label htmlFor="newEmail" className="text-xs font-medium">
            New e-mail address
          </Label>
          <Input
            id="newEmail"
            type="email"
            value={emailDraft}
            onChange={(e) => {
              setEmailDraft(e.target.value);
              setIsDirty(true);
            }}
            placeholder="new.address@example.com"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Current: <strong>{profile === null ? "Not signed in" : profile.email}</strong>
        </p>
        <div className="pt-2">
          <p>Kind regards,</p>
          <p className="font-medium">{profile === null ? "[Your name]" : profile.name}</p>
        </div>
      </MessagePreview>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Close</Button>
        </DialogClose>
        <Button>Send request</Button>
      </DialogFooter>
    </>
  );
}
