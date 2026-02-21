"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AuthState } from "../types/user";
import { mockUsers } from "../data/mock-users";

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updatePhotoPermission: (permission: "internal+external" | "internal" | "nowhere") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "sib_auth_state";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      try {
        const parsedAuth = JSON.parse(storedAuth);
        setAuthState(parsedAuth);
      } catch (error) {
        console.error("Failed to parse stored auth state:", error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (authState.isAuthenticated) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, [authState, isHydrated]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const user = mockUsers.find((u) => u.email === email);
    if (user && password === "password") {
      const newAuthState = {
        user,
        isAuthenticated: true,
      };
      setAuthState(newAuthState);
      return true;
    }
    return false;
  };

  const logout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
    });
  };

  const updatePhotoPermission = (permission: "internal+external" | "internal" | "nowhere") => {
    if (authState.user) {
      const updatedUser = { ...authState.user, photoPermission: permission };
      const newAuthState = {
        ...authState,
        user: updatedUser,
      };
      setAuthState(newAuthState);

      const userIndex = mockUsers.findIndex((u) => u.id === authState.user!.id);
      if (userIndex !== -1) {
        mockUsers[userIndex] = updatedUser;
      }
    }
  };

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
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
