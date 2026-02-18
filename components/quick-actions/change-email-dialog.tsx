"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { MessagePreview } from "@/components/quick-actions/message-preview"

export function ChangeEmailDialog() {
  const { user } = useAuth()
  const [emailDraft, setEmailDraft] = useState(user?.email ?? "")

  useEffect(() => {
    setEmailDraft(user?.email ?? "")
  }, [user?.email])

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
        replyTo={user?.email ?? undefined}
      >
        <p>Hi,</p>
        <p>I would like to update my account e-mail address.</p>
        <div>
          <Label htmlFor="newEmail" className="text-xs font-medium">New e-mail address</Label>
          <Input
            id="newEmail"
            type="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="new.address@example.com"
          />
        </div>
        <p className="text-xs text-muted-foreground">Current: <strong>{user?.email ?? 'Not signed in'}</strong></p>
        <div className="pt-2">
          <p>Kind regards,</p>
          <p className="font-medium">{user?.name ?? "[Your name]"}</p>
        </div>
      </MessagePreview>
      <DialogFooter>
        <Button variant="secondary">Close</Button>
        <Button>Send request</Button>
      </DialogFooter>
    </>
  )
}
