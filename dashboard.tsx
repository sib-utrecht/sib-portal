"use client"

import { AuthProvider, useAuth } from "./contexts/auth-context"
import { LoginForm } from "./components/login-form"
import { MemberDashboard } from "./components/member-dashboard"
import { AdminDashboard } from "./components/admin-dashboard"

function AppContent() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  if (user?.role === "admin") {
    return <AdminDashboard />
  }

  return <MemberDashboard />
}

export default function Dashboard() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
