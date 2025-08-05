import type { User } from "../types/user"

export const mockUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "member",
    photoPermission: "internal+external",
    avatar: "/abstract-profile.png",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "admin",
    photoPermission: "internal",
    avatar: "/admin-interface.png",
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike@example.com",
    role: "member",
    photoPermission: "nowhere",
    avatar: "/community-member.png",
  },
  {
    id: "4",
    name: "Sarah Wilson",
    email: "sarah@example.com",
    role: "member",
    photoPermission: "internal+external",
    avatar: "/abstract-geometric-shapes.png",
  },
]
