import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhotoPermissionSettings } from "@/components/photo-permission-settings";
import { RequireAuth } from "@/components/require-auth";
import { Mail, PencilLine, Phone, ShieldQuestion, UserRoundCog } from "lucide-react";
import { ChangeAddressDialog } from "@/components/quick-actions/change-address-dialog";
import { ChangeEmailDialog } from "@/components/quick-actions/change-email-dialog";
import { ChangePhoneDialog } from "@/components/quick-actions/change-phone-dialog";
import { ChangeBankDetailsDialog } from "@/components/quick-actions/change-bank-details-dialog";
import { UpdateEcpDialog } from "@/components/quick-actions/update-ecp-dialog";

export default function SettingsPage() {
  // Local demo state only (no persistence yet)
  const [newsletter, setNewsletter] = useState(true);
  const [postalCards, setPostalCards] = useState(false);
  const [language, setLanguage] = useState<"Dutch" | "English">("Dutch");
  const [pronouns, setPronouns] = useState("she/they");
  const [study, setStudy] = useState("Utrecht University");

  return (
    <RequireAuth>
      <div className="min-h-screen portal-bg">
        <header className="portal-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold portal-title">Preferences</h1>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="border-[#21526f]/30 hover:bg-[#eaf3f7] hover:text-[#21526f]">
                  <Link to="/">Back to dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-6">
            <div className="space-y-6">
              <Card className="border-t-4 border-t-[#21526f] shadow-sm shadow-[#21526f]/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-[#21526f]">
                    <div className="p-1.5 rounded-lg bg-[#eaf3f7]">
                      <svg className="h-4 w-4 text-[#21526f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    Photo permission
                  </CardTitle>
                  <CardDescription>Control where your photos may be used</CardDescription>
                </CardHeader>
                <CardContent>
                  <PhotoPermissionSettings />
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-t-4 border-t-[#6fb0cd] shadow-sm shadow-[#21526f]/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#21526f]">
                      <div className="p-1.5 rounded-lg bg-[#eaf3f7]">
                        <Mail className="h-4 w-4 text-[#21526f]" />
                      </div>
                      Communication
                    </CardTitle>
                    <CardDescription>Choose how we may contact you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="newsletter"
                        checked={newsletter}
                        onCheckedChange={(checked) => setNewsletter(checked === true)}
                      />
                      <Label htmlFor="newsletter">Newsletter (e-SIB)</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="postalCards"
                        checked={postalCards}
                        onCheckedChange={(checked) => setPostalCards(checked === true)}
                      />
                      <Label htmlFor="postalCards">Postal cards (e.g., for Christmas)</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Language of preference</Label>
                      <Select
                        value={language}
                        onValueChange={(v) => setLanguage(v as "Dutch" | "English")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dutch">Dutch</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="border-t-4 border-t-[#6fb0cd] shadow-sm shadow-[#21526f]/5">
                    <CardHeader>
                      <CardTitle className="text-[#21526f]">Pronouns</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Input
                        value={pronouns}
                        onChange={(e) => setPronouns(e.target.value)}
                        placeholder="e.g. they/them"
                        list="pronoun-suggestions"
                      />
                      <datalist id="pronoun-suggestions">
                        <option value="she/her" />
                        <option value="he/him" />
                        <option value="they/them" />
                        <option value="ze/zir" />
                      </datalist>
                    </CardContent>
                  </Card>

                  <Card className="border-t-4 border-t-[#6fb0cd] shadow-sm shadow-[#21526f]/5">
                    <CardHeader>
                      <CardTitle className="text-[#21526f]">I study at</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Input
                        list="study-suggestions"
                        value={study}
                        onChange={(e) => setStudy(e.target.value)}
                      />
                      <datalist id="study-suggestions">
                        <option value="Utrecht University" />
                        <option value="Hogeschool Utrecht" />
                        <option value="MBO Utrecht" />
                        <option value="HKU" />
                        <option value="Nothing" />
                      </datalist>
                      <p className="text-xs text-muted-foreground">
                        <strong>Why do you need to know?</strong> To get funding from educational
                        institutions, we must know how many of their students we have.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card className="border-t-4 border-t-[#21526f] shadow-sm shadow-[#21526f]/5">
                <CardHeader>
                  <CardTitle className="text-[#21526f]">Your membership</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="font-medium">Started at</p>
                      <p className="text-sm text-muted-foreground">14 August 2025</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Current period</p>
                      <p className="text-sm text-muted-foreground">
                        September 2025 – January 2026 • €10-deal
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="font-medium">Automatically extends</p>
                      <p className="text-sm text-muted-foreground">December 31st 2025</p>
                    </div>
                    <div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline">Cancel membership</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cancel membership</DialogTitle>
                            <DialogDescription>
                              This will notify the secretary. They may reach out to confirm your
                              request.
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

              <Card className="border-t-4 border-t-[#6fb0cd] shadow-sm shadow-[#21526f]/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#21526f]">
                    <div className="p-1.5 rounded-lg bg-[#eaf3f7]">
                      <UserRoundCog className="h-4 w-4 text-[#21526f]" />
                    </div>
                    Quick actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: "Change address", icon: PencilLine, content: ChangeAddressDialog },
                    { label: "Change phone number", icon: Phone, content: ChangePhoneDialog },
                    { label: "Change e-mail address", icon: Mail, content: ChangeEmailDialog },
                    {
                      label: "Change bank details",
                      icon: PencilLine,
                      content: ChangeBankDetailsDialog,
                    },
                    { label: "Update ECP", icon: ShieldQuestion, content: UpdateEcpDialog },
                  ].map((action) => (
                    <Dialog key={action.label}>
                      <DialogTrigger asChild>
                        <Button variant="link" className="justify-start px-0">
                          <action.icon className="h-4 w-4" />
                          {action.label}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <action.content />
                      </DialogContent>
                    </Dialog>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
