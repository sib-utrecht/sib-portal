import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, LogOut, User } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "../contexts/auth-context";
import { PhotoPermissionSettings } from "./photo-permission-settings";
import { ActivitiesList } from "./activities-list";
import { useNavigate } from "react-router-dom";

/**
 * Main dashboard for authenticated members.
 *
 * Displays the member's profile information (name, email, role, avatar),
 * their current photo-permission settings via {@link PhotoPermissionSettings},
 * and a live list of upcoming activities via {@link ActivitiesList}.
 * Also provides logout and preferences navigation links in the header.
 */
export function MemberDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const profileData = useQuery(api.users.getProfile);
  const isLoading = profileData === undefined;
  const user = profileData ?? { name: "User", email: "", role: "member" as const, avatar: null };
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen portal-bg">
      <header className="portal-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold portal-title">Member Dashboard</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : (
                  <>
                    <Avatar className="h-8 w-8 ring-2 ring-[#21526f]/20">
                      <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                      <AvatarFallback className="bg-[#eaf3f7] text-[#21526f] font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-[#21526f]">{user.name}</span>
                  </>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="border-[#21526f]/30 hover:bg-[#eaf3f7] hover:text-[#21526f]">
                <Link to="/settings">Preferences</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-[#21526f]/30 hover:bg-[#eaf3f7] hover:text-[#21526f]">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Profile and Photo Permissions */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-t-4 border-t-[#21526f] shadow-sm shadow-[#21526f]/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#21526f]">
                  <div className="p-1.5 rounded-lg bg-[#eaf3f7]">
                    <User className="h-4 w-4 text-[#21526f]" />
                  </div>
                  Profile Information
                </CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar className="h-16 w-16 ring-2 ring-[#21526f]/20">
                        <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                        <AvatarFallback className="text-lg bg-[#eaf3f7] text-[#21526f] font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{user.name}</h3>
                        <p className="text-gray-500 text-sm">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[#eaf3f7] text-[#21526f] capitalize">{user.role}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-[#6fb0cd] shadow-sm shadow-[#21526f]/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#21526f]">
                  <div className="p-1.5 rounded-lg bg-[#eaf3f7]">
                    <Camera className="h-4 w-4 text-[#21526f]" />
                  </div>
                  Photo Permissions
                </CardTitle>
                <CardDescription>
                  Control how your photos can be used by the organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <PhotoPermissionSettings />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <ActivitiesList />
          </div>
        </div>
      </main>
    </div>
  );
}
