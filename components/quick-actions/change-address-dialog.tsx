"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessagePreview } from "@/components/quick-actions/message-preview"
import { useAuth } from "@/contexts/auth-context"

export function ChangeAddressDialog() {
    const { user } = useAuth()
    const [postalCode, setPostalCode] = useState("")
    const [houseNumber, setHouseNumber] = useState("")
    const [street, setStreet] = useState("")
    const [place, setPlace] = useState("")

    const autoFillFromPostal = () => {
        if (postalCode && houseNumber && !street && !place) {
            setStreet("Sesamstraat")
            setPlace("Utrecht")
        }
    }

    const autoFillFromStreet = () => {
        if (street && place && !postalCode) {
            setPostalCode("3500AA")
        }
    }

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
                    replyTo={user?.email ?? undefined}
                >
                    <p>Hi,</p>
                    <p>I would like to update my address to:</p>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label htmlFor="postalCode" className="text-xs font-medium">Postal code</Label>
                            <Input
                                id="postalCode"
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                                onBlur={autoFillFromPostal}
                                placeholder=""
                            />
                        </div>
                        <div>
                            <Label htmlFor="houseNumber" className="text-xs font-medium">Number</Label>
                            <Input
                                id="houseNumber"
                                value={houseNumber}
                                onChange={(e) => setHouseNumber(e.target.value)}
                                onBlur={autoFillFromPostal}
                                placeholder=""
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <Label htmlFor="street" className="text-xs font-medium">Street</Label>
                            <Input
                                id="street"
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                onBlur={autoFillFromStreet}
                                placeholder=""
                            />
                        </div>
                        <div>
                            <Label htmlFor="place" className="text-xs font-medium">Place</Label>
                            <Input
                                id="place"
                                value={place}
                                onChange={(e) => setPlace(e.target.value)}
                                onBlur={autoFillFromStreet}
                                placeholder=""
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <p>Kind regards,</p>
                        <p className="font-medium">{user?.name ?? "[Your name]"}</p>
                    </div>
                </MessagePreview>
            </div>
            <DialogFooter>
                <Button variant="secondary">Close</Button>
                <Button>Submit</Button>
            </DialogFooter>
        </>
    )
}
