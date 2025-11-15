"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, SetStateAction } from "react"
import type { AuthState, PhotoPermission, User } from "../types/user"
import { api } from "../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

interface AuthContextType extends AuthState {
    login: (users: User[], email: string, password: string) => Promise<boolean>
    logout: () => void
    updatePhotoPermission: (permission: PhotoPermission) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "sib_auth_state"

export function AuthProvider({ children }: { children: ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
    })
    const [isHydrated, setIsHydrated] = useState(false)

    useEffect(() => {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
        if (storedAuth) {
            try {
                const parsedAuth = JSON.parse(storedAuth)
                setAuthState(parsedAuth)
            } catch (error) {
                console.error("Failed to parse stored auth state:", error)
                localStorage.removeItem(AUTH_STORAGE_KEY)
            }
        }
        setIsHydrated(true)
    }, [])

    useEffect(() => {
        if (isHydrated) {
            if (authState.isAuthenticated) {
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState))
            } else {
                localStorage.removeItem(AUTH_STORAGE_KEY)
            }
        }
    }, [authState, isHydrated])

    const login = async (users: User[], email: string, password: string): Promise<boolean> => {
        const foundUser = users.find((u) => u.email === email && u.password === "password");
        if (foundUser === undefined) {
            return false
        }
        const newAuthState = {
            user: foundUser,
            isAuthenticated: true,
        }
        setAuthState(newAuthState)
        return true
    }

    const logout = () => {
        setAuthState({
            user: null,
            isAuthenticated: false,
        })
    }

    const updatePhotoPermission = (permission: PhotoPermission) => {
        if (authState.user) {
            const updatedUser = { ...authState.user, photoPermission: permission }
            const newAuthState = {
                ...authState,
                user: updatedUser,
            }
            setAuthState(newAuthState);
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
