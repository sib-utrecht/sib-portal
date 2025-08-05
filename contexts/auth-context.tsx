"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { AuthState } from "../types/user"
import { mockUsers } from "../data/mock-users"

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updatePhotoPermission: (permission: "internal+external" | "internal" | "nowhere") => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  })

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication - in real app, this would call an API
    const user = mockUsers.find((u) => u.email === email)
    if (user && password === "password") {
      setAuthState({
        user,
        isAuthenticated: true,
      })
      return true
    }
    return false
  }

  const logout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
    })
  }

  const updatePhotoPermission = (permission: "internal+external" | "internal" | "nowhere") => {
    if (authState.user) {
      const updatedUser = { ...authState.user, photoPermission: permission }
      setAuthState({
        ...authState,
        user: updatedUser,
      })

      // Update mock data
      const userIndex = mockUsers.findIndex((u) => u.id === authState.user!.id)
      if (userIndex !== -1) {
        mockUsers[userIndex] = updatedUser
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        updatePhotoPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
