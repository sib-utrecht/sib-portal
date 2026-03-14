"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessagePreview } from "@/components/quick-actions/message-preview";
import { useAuth } from "@/contexts/auth-context";

export function UpdateEcpDialog() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <>
      <DialogHeader>
        <DialogTitle>Update emergency contact person</DialogTitle>
        <DialogDescription>
          This will send a message to the secretary who will process your request.
        </DialogDescription>
      </DialogHeader>
      <MessagePreview
        subject="Request: Update emergency contact person"
        to="info@sib-utrecht.nl"
        replyTo={user?.email ?? undefined}
      >
        <p>Hi,</p>
        <p>I would like to update my emergency contact person details.</p>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="ecpName" className="text-xs font-medium">
              Name
            </Label>
            <Input
              id="ecpName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
            />
          </div>
          <div>
            <Label htmlFor="ecpPhone" className="text-xs font-medium">
              Phone number
            </Label>
            <Input
              id="ecpPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder=""
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
        <Button disabled={!name || !phone}>Send request</Button>
      </DialogFooter>
    </>
  );
}
