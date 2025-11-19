"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessagePreview } from "@/components/quick-actions/message-preview"
import { useAuth } from "@/contexts/auth-context"

export function ChangePhoneDialog() {
  const { user } = useAuth()
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  return (
    <>
      <DialogHeader>
        <DialogTitle>Change phone number</DialogTitle>
        <DialogDescription>
          This will send a message to the secretary who will process your request.
        </DialogDescription>
      </DialogHeader>
      <MessagePreview
        subject="Request: Change of phone number"
        to="info@sib-utrecht.nl"
        replyTo={user?.email ?? undefined}
      >
        <p>Hi,</p>
        <p>I would like to update my phone number.</p>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="newPhone" className="text-xs font-medium">Phone number</Label>
            <Input
              id="newPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+31 6 12345678"
              inputMode="tel"
            />
          </div>
        </div>
        <div className="pt-2">
          <p>Kind regards,</p>
          <p className="font-medium">{user?.name ?? "[Your name]"}</p>
        </div>
      </MessagePreview>
      <DialogFooter>
        <Button variant="secondary">Close</Button>
        <Button disabled={!phone}>Send request</Button>
      </DialogFooter>
    </>
  )
}
