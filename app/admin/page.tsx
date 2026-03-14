"use client";

import { AdminDashboard } from "@/components/admin-dashboard";
import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/require-admin";

export default function AdminPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AdminDashboard />
      </RequireAdmin>
    </RequireAuth>
  );
}
