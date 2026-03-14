"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AdminDashboard } from "@/components/admin-dashboard";
import { RequireAuth } from "@/components/require-auth";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;
  return <>{children}</>;
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <AdminGuard>
        <AdminDashboard />
      </AdminGuard>
    </RequireAuth>
  );
}
