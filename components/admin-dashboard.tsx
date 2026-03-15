"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogOut, Users, Camera, Eye, EyeOff, X, Filter, Search, type LucideIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useAuth } from "../contexts/auth-context";
import { useRouter } from "next/navigation";
import type { PhotoPermission } from "../types/user";

interface FilterCardProps {
  label: string;
  Icon: LucideIcon;
  colorClass: string;
  ringClass: string;
  bgClass: string;
  count: number;
  isSelected: boolean;
  onToggle: () => void;
}

function FilterCard({ label, Icon, colorClass, ringClass, bgClass, count, isSelected, onToggle }: FilterCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md relative ${
        isSelected ? `ring-2 ${ringClass} ${bgClass}` : ""
      }`}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
        <p className="text-2xl font-bold">{count}</p>
        {isSelected && (
          <div className="flex items-center gap-1 mt-1">
            <Filter className={`h-3 w-3 ${colorClass}`} />
            <p className={`text-xs ${colorClass}`}>Active filter</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Returns display metadata (label, CSS class names, and icon component) for a
 * given photo-permission value, used to render consistently styled badges in
 * the admin member table and filter UI.
 *
 * @param permission - The photo-permission value to look up.
 */
const getPermissionBadge = (permission: PhotoPermission) => {
  switch (permission) {
    case "internal+external":
      return {
        label: "Internal + External",
        className: "bg-green-100 text-green-800",
        icon: Camera,
      };
    case "internal":
      return {
        label: "Internal Only",
        className: "bg-yellow-100 text-yellow-800",
        icon: Eye,
      };
    case "nowhere":
      return {
        label: "No Usage",
        className: "bg-red-100 text-red-800",
        icon: EyeOff,
      };
  }
};

/**
 * Admin-only dashboard for managing member photo permissions.
 *
 * Displays summary stat cards (total members, counts per permission level) that
 * double as clickable filters.  The member table below updates in real-time to
 * show only the rows that match the active filter selection.  A filter status
 * bar with a "Clear All Filters" button is shown whenever at least one filter
 * is active.
 *
 * Non-admin users see an "Access Denied" message instead of the dashboard.
 */
export function AdminDashboard() {
  const { logout, isAdmin } = useAuth();
  const router = useRouter();
  const [selectedPermissions, setSelectedPermissions] = useState<Set<PhotoPermission>>(new Set());

  const profileData = useQuery(api.users.getProfile);
  const usersData = useQuery(api.users.getUsers);

  if (profileData === undefined || usersData === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const user = profileData ?? { name: "Admin", email: "", avatar: null };
  const users = usersData ?? [];

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  // if (!user || user.role !== "admin") return null
  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Access Denied</div>;
  }

  const permissionStats = {
    "internal+external": users.filter((u) => u.photoPermission === "internal+external").length,
    internal: users.filter((u) => u.photoPermission === "internal").length,
    nowhere: users.filter((u) => u.photoPermission === "nowhere").length,
  };

  // Filter members based on selected permissions
  const filteredMembers =
    selectedPermissions.size === 0
      ? users
      : users.filter((u) => selectedPermissions.has(u.photoPermission));

  const togglePermissionFilter = (permission: PhotoPermission) => {
    const newSelectedPermissions = new Set(selectedPermissions);
    if (newSelectedPermissions.has(permission)) {
      newSelectedPermissions.delete(permission);
    } else {
      newSelectedPermissions.add(permission);
    }
    setSelectedPermissions(newSelectedPermissions);
  };

  const clearAllFilters = () => {
    setSelectedPermissions(new Set());
  };

  const isPermissionSelected = (permission: PhotoPermission) => {
    return selectedPermissions.has(permission);
  };

  const hasActiveFilters = selectedPermissions.size > 0;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
      <header className="bg-white shadow-sm border-b border-t-4 border-[#21526f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback>
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.name}</span>
                <Badge variant="secondary">Admin</Badge>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/photo-permissions">
                  <Search className="h-4 w-4 mr-2" />
                  Photo Search
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="relative">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-gray-600">Total Members</span>
                </div>
                <p className="text-2xl font-bold">{users.length}</p>
                {!hasActiveFilters && (
                  <p className="text-xs text-primary mt-1">Showing all members</p>
                )}
              </CardContent>
            </Card>

            <FilterCard
              label="Full Permission"
              Icon={Camera}
              colorClass="text-green-600"
              ringClass="ring-green-500"
              bgClass="bg-green-50"
              count={permissionStats["internal+external"]}
              isSelected={isPermissionSelected("internal+external")}
              onToggle={() => togglePermissionFilter("internal+external")}
            />

            <FilterCard
              label="Internal Only"
              Icon={Eye}
              colorClass="text-yellow-600"
              ringClass="ring-yellow-500"
              bgClass="bg-yellow-50"
              count={permissionStats.internal}
              isSelected={isPermissionSelected("internal")}
              onToggle={() => togglePermissionFilter("internal")}
            />

            <FilterCard
              label="No Usage"
              Icon={EyeOff}
              colorClass="text-red-600"
              ringClass="ring-red-500"
              bgClass="bg-red-50"
              count={permissionStats.nowhere}
              isSelected={isPermissionSelected("nowhere")}
              onToggle={() => togglePermissionFilter("nowhere")}
            />
          </div>

          {/* Filter Status and Reset Button */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between p-4 bg-accent border border-accent/60 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Active filters:</span>
                {Array.from(selectedPermissions).map((permission) => {
                  const permissionInfo = getPermissionBadge(permission);
                  const Icon = permissionInfo.icon;
                  return (
                    <Badge key={permission} className={permissionInfo.className}>
                      <Icon className="h-3 w-3 mr-1" />
                      {permissionInfo.label}
                    </Badge>
                  );
                })}
                <Badge variant="outline" className="ml-2">
                  {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""} shown
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          )}

          {/* Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Member Photo Permissions
                {hasActiveFilters && (
                  <span className="text-base font-normal text-gray-600 ml-2">
                    ({filteredMembers.length} of {users.length} members)
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {hasActiveFilters
                  ? `Showing members with selected permission${selectedPermissions.size > 1 ? "s" : ""}`
                  : "Overview of all member photo permission settings"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Photo Permission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No members found with the selected permission settings.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => {
                      const permissionInfo = getPermissionBadge(member.photoPermission);
                      const Icon = permissionInfo.icon;
                      const isHighlighted = selectedPermissions.has(member.photoPermission);

                      return (
                        <TableRow key={member._id} className={isHighlighted ? "bg-accent" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={member.avatar || "/placeholder.svg"}
                                  alt={member.name}
                                />
                                <AvatarFallback>
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{member.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{member.email}</TableCell>
                          <TableCell>
                            <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={permissionInfo.className}>
                              <Icon className="h-3 w-3 mr-1" />
                              {permissionInfo.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
