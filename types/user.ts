export type PhotoPermission = "internal+external" | "internal" | "nowhere"

export interface User {
  id: string
  name: string
  email: string
  role: "member" | "admin"
  photoPermission: PhotoPermission
  avatar?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}
