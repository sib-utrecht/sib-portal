"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

/**
 * Route guard that restricts access to admin users only.
 *
 * While the auth state is still loading a placeholder is rendered.  Once
 * loading completes, non-admin users are redirected to the root path (`/`).
 * Admin users see the wrapped `children` as normal.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
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
