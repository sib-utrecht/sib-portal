export type PhotoPermission = "internal+external" | "internal" | "nowhere"

export interface User {
    _id: string
    name: string
    email: string
    password: string
    role: "member" | "admin"
    photoPermission: PhotoPermission
    avatar?: string
}

export interface AuthState {
    user: User | null
    isAuthenticated: boolean
}
