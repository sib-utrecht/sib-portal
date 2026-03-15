"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessagePreview } from "@/components/quick-actions/message-preview";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Dialog content for requesting a postal-address change.
 *
 * The member fills in their new postal code, house number, street, and place,
 * which are embedded in a pre-formatted request email to the secretary.
 * The postal code is automatically uppercased as the member types.
 */
export function ChangeAddressDialog() {
  const profile = useQuery(api.users.getProfile);
  const [postalCode, setPostalCode] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [place, setPlace] = useState("");

  return (
    <>
      <DialogHeader>
        <DialogTitle>Change address</DialogTitle>
        <DialogDescription>
          This will send a message to the secretary who will process your request.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6">
        <MessagePreview
          subject="Request: Change of address"
          to="info@sib-utrecht.nl"
          replyTo={profile?.email}
        >
          <p>Hi,</p>
          <p>I would like to update my address to:</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="postalCode" className="text-xs font-medium">
                Postal code
              </Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                placeholder=""
              />
            </div>
            <div>
              <Label htmlFor="houseNumber" className="text-xs font-medium">
                Number
              </Label>
              <Input
                id="houseNumber"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                placeholder=""
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="street" className="text-xs font-medium">
                Street
              </Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder=""
              />
            </div>
            <div>
              <Label htmlFor="place" className="text-xs font-medium">
                Place
              </Label>
              <Input
                id="place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder=""
              />
            </div>
          </div>
          <div className="pt-2">
            <p>Kind regards,</p>
            <p className="font-medium">{profile?.name ?? "[Your name]"}</p>
          </div>
        </MessagePreview>
      </div>
      <DialogFooter>
        <Button variant="secondary">Close</Button>
        <Button>Submit</Button>
      </DialogFooter>
    </>
  );
}
