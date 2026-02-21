"use client";

import { useAuth } from "./contexts/auth-context";
import { LoginForm } from "./components/login-form";
import { MemberDashboard } from "./components/member-dashboard";
import { AdminDashboard } from "./components/admin-dashboard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function AppContent() {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    useEffect(() => {
      router.replace("/login");
    });
    return <LoginForm />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <MemberDashboard />;
}

export default function Dashboard() {
  return <AppContent />;
}
