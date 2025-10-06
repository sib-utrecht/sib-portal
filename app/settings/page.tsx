"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PhotoPermissionSettings } from "@/components/photo-permission-settings"
import { RequireAuth } from "@/components/require-auth"
import { useAuth } from "@/contexts/auth-context"
import { Mail, PencilLine, Phone, ShieldQuestion, UserRoundCog } from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuth()

  // Local demo state only (no persistence yet)
  const [newsletter, setNewsletter] = useState(true)
  const [postalCards, setPostalCards] = useState(false)
  const [speakDutch, setSpeakDutch] = useState(true)
  const [ecp, setEcp] = useState("Dagobert Duck")
  const [pronouns, setPronouns] = useState("she/they")
  const [study, setStudy] = useState("Utrecht University")

  // Address form demo state
  const [postalCode, setPostalCode] = useState("")
  const [houseNumber, setHouseNumber] = useState("")
  const [street, setStreet] = useState("")
  const [place, setPlace] = useState("")
  const [emailDraft, setEmailDraft] = useState(user?.email ?? "")

  const autoFillFromPostal = () => {
    // Simple mock autofill – in real app call a postcode API
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
    <RequireAuth>
    <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Preferences</h1>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left 2/3 column: photo permission, communication, pronouns, study, membership */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photo permission</CardTitle>
                <CardDescription>Control where your photos may be used</CardDescription>
              </CardHeader>
              <CardContent>
                <PhotoPermissionSettings />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Communication</CardTitle>
                  <CardDescription>Choose how we may contact you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={newsletter}
                      onChange={(e) => setNewsletter(e.target.checked)}
                    />
                    <span>Newsletter (e-SIB)</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={postalCards}
                      onChange={(e) => setPostalCards(e.target.checked)}
                    />
                    <span>Postal cards (e.g., for Christmas)</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={speakDutch}
                      onChange={(e) => setSpeakDutch(e.target.checked)}
                    />
                    <span>I speak Dutch</span>
                  </label>
                  <div className="space-y-2">
                    <Label>Emergency contact person (ECP)</Label>
                    <Input value={ecp} onChange={(e) => setEcp(e.target.value)} placeholder="Name of ECP" />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pronouns</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input
                      value={pronouns}
                      onChange={(e) => setPronouns(e.target.value)}
                      placeholder="e.g., she/they"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>I study at</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input list="study-suggestions" value={study} onChange={(e) => setStudy(e.target.value)} />
                    <datalist id="study-suggestions">
                      <option value="Utrecht University" />
                      <option value="HU University of Applied Sciences Utrecht" />
                      <option value="Avans University of Applied Sciences" />
                      <option value="Other" />
                    </datalist>
                    <p className="text-xs text-muted-foreground">
                      <strong>Why do you need to know?</strong> To get funding from educational institutions, we must know how many of
                      their students we have.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Your membership</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="font-medium">Started at</p>
                    <p className="text-sm text-muted-foreground">14 August 2025</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Current period</p>
                    <p className="text-sm text-muted-foreground">September 2025 – January 2026 • €10-deal (€10)</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="font-medium">Renewal at December 31st 2025</p>
                    <p className="text-sm text-muted-foreground">February 2026 – August 2026 • Remainder of the year (€60)</p>
                  </div>
                  <div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">Cancel renewal</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancel membership renewal</DialogTitle>
                          <DialogDescription>
                            This will notify the secretary. They may reach out to confirm your request.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="secondary">Close</Button>
                          <Button variant="destructive">Send request</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserRoundCog className="h-4 w-4"/>Quick actions</CardTitle>
                <CardDescription>Open a dialog to request changes</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Change address", icon: PencilLine },
                  { label: "Change phone number", icon: Phone },
                  { label: "Change e-mail address", icon: Mail },
                  { label: "Change bank details", icon: PencilLine },
                  { label: "Update ECP", icon: ShieldQuestion },
                  { label: "Cancel membership", icon: PencilLine },
                ].map((action) => (
                  <Dialog key={action.label}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="justify-start px-0"><action.icon className="h-4 w-4"/>{action.label}</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{action.label}</DialogTitle>
                        <DialogDescription>
                          This will send a message to the secretary who will process your request.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Label>Short message</Label>
                        <Input placeholder="Optional note to the secretary" />
                      </div>
                      <DialogFooter>
                        <Button variant="secondary">Close</Button>
                        <Button>Send request</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right 1/3 column: address + email change forms */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>I want to change my address to</CardTitle>
                <CardDescription>
                  We don’t store your address for security reasons, so we won’t show it. Auto-complete will help
                  when you fill postal code + number or street + place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Postal code</Label>
                    <Input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                      onBlur={autoFillFromPostal}
                      placeholder="3500AA"
                    />
                  </div>
                  <div>
                    <Label>Number</Label>
                    <Input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} onBlur={autoFillFromPostal} placeholder="5" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Street</Label>
                    <Input value={street} onChange={(e) => setStreet(e.target.value)} onBlur={autoFillFromStreet} list="street-suggestions" placeholder="Sesamstraat" />
                    <datalist id="street-suggestions">
                      <option value="Sesamstraat" />
                      <option value="Oudegracht" />
                      <option value="Neude" />
                    </datalist>
                  </div>
                  <div>
                    <Label>Place</Label>
                    <Input value={place} onChange={(e) => setPlace(e.target.value)} onBlur={autoFillFromStreet} placeholder="Utrecht" />
                  </div>
                </div>
                <div>
                  <Button className="mt-2">Submit</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current e-mail address</CardTitle>
                <CardDescription>{user?.email ?? "Not signed in"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label>I want to change my e-mail address to</Label>
                <Input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="hello2@example.com" />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="mt-2">Submit</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change e-mail address</DialogTitle>
                      <DialogDescription>
                        This will send an e-mail to info@sib-utrecht.nl and will be processed by the secretary.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="secondary">Close</Button>
                      <Button>Send request</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
    </RequireAuth>
  )
}
