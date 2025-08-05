"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LogOut, Users, Camera, Eye, EyeOff } from "lucide-react"
import { useAuth } from "../contexts/auth-context"
import { mockUsers } from "../data/mock-users"
import type { PhotoPermission } from "../types/user"

const getPermissionBadge = (permission: PhotoPermission) => {
  switch (permission) {
    case "internal+external":
      return {
        label: "Internal + External",
        className: "bg-green-100 text-green-800",
        icon: Camera,
      }
    case "internal":
      return {
        label: "Internal Only",
        className: "bg-yellow-100 text-yellow-800",
        icon: Eye,
      }
    case "nowhere":
      return {
        label: "No Usage",
        className: "bg-red-100 text-red-800",
        icon: EyeOff,
      }
  }
}

export function AdminDashboard() {
  const { user, logout } = useAuth()

  if (!user || user.role !== "admin") return null

  const members = mockUsers.filter((u) => u.role === "member")
  const permissionStats = {
    "internal+external": mockUsers.filter((u) => u.photoPermission === "internal+external").length,
    internal: mockUsers.filter((u) => u.photoPermission === "internal").length,
    nowhere: mockUsers.filter((u) => u.photoPermission === "nowhere").length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
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
              <Button variant="outline" size="sm" onClick={logout}>
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
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Members</span>
                </div>
                <p className="text-2xl font-bold">{mockUsers.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Full Permission</span>
                </div>
                <p className="text-2xl font-bold">{permissionStats["internal+external"]}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-600">Internal Only</span>
                </div>
                <p className="text-2xl font-bold">{permissionStats.internal}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-600">No Usage</span>
                </div>
                <p className="text-2xl font-bold">{permissionStats.nowhere}</p>
              </CardContent>
            </Card>
          </div>

          {/* Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>Member Photo Permissions</CardTitle>
              <CardDescription>Overview of all member photo permission settings</CardDescription>
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
                  {mockUsers.map((member) => {
                    const permissionInfo = getPermissionBadge(member.photoPermission)
                    const Icon = permissionInfo.icon

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
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
                          <Badge variant={member.role === "admin" ? "default" : "secondary"}>{member.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={permissionInfo.className}>
                            <Icon className="h-3 w-3 mr-1" />
                            {permissionInfo.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
