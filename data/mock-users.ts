import type { User } from "../types/user";

export const mockUsers: User[] = [
  {
    _id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "member",
    photoPermission: "internal+external",
  },
  {
    _id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "admin",
    photoPermission: "internal",
  },
  {
    _id: "3",
    name: "Mike Johnson",
    email: "mike@example.com",
    role: "member",
    photoPermission: "nowhere",
  },
  {
    _id: "4",
    name: "Sarah Wilson",
    email: "sarah@example.com",
    role: "member",
    photoPermission: "internal+external",
  },
];
