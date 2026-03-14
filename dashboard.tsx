"use client";

import { MemberDashboard } from "./components/member-dashboard";
import { RequireAuth } from "./components/require-auth";

export default function Dashboard() {
  return (
    <RequireAuth>
      <MemberDashboard />
    </RequireAuth>
  );
}
