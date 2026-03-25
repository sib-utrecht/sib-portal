"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePathname, useRouter } from "next/navigation";

/**
 * Route guard that redirects unauthenticated users to the login page.
 *
 * While the auth state is still loading a placeholder is rendered.  Once
 * loading completes, unauthenticated visitors are redirected to `/login` with
 * the current path appended as `?redirect_uri=…` so they land back here after
 * signing in.  Authenticated users see the wrapped `children` as normal.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const url = new URL("/login", window.location.origin);
      url.searchParams.set("redirect_uri", pathname || "/");
      router.replace(url.pathname + url.search);
    }
  }, [isAuthenticated, pathname, router, isLoading]);
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
