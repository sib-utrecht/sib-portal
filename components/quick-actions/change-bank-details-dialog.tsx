"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessagePreview } from "@/components/quick-actions/message-preview";
import { useAuth } from "@/contexts/auth-context";

export function ChangeBankDetailsDialog() {
  const { user } = useAuth();
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [note, setNote] = useState("");
  const showBic = iban.trim().length >= 2 && !iban.toUpperCase().startsWith("NL");

  return (
    <>
      <DialogHeader>
        <DialogTitle>Change bank details</DialogTitle>
        <DialogDescription>
          This will send a message to the secretary who will process your request.
        </DialogDescription>
      </DialogHeader>
      <MessagePreview
        subject="Request: Change of bank details"
        to="info@sib-utrecht.nl"
        replyTo={user?.email ?? undefined}
      >
        <p>Hi,</p>
        <p>I would like to update my bank details.</p>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="iban" className="text-xs font-medium">
              IBAN
            </Label>
            <Input
              id="iban"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              placeholder="NL00BANK0123456789"
            />
          </div>
          {showBic && (
            <div>
              <Label htmlFor="bic" className="text-xs font-medium">
                BIC
              </Label>
              <Input
                id="bic"
                value={bic}
                onChange={(e) => setBic(e.target.value.toUpperCase())}
                placeholder="BANKNL2A"
              />
            </div>
          )}
        </div>
        <div className="pt-2">
          <p>Kind regards,</p>
          <p className="font-medium">{user?.name ?? "[Your name]"}</p>
        </div>
      </MessagePreview>
      <DialogFooter>
        <Button variant="secondary">Close</Button>
        <Button disabled={!iban}>Send request</Button>
      </DialogFooter>
    </>
  );
}
