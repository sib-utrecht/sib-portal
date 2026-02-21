"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePathname, useRouter } from "next/navigation";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  console.log("RequireAuth: isAuthenticated =", isAuthenticated, " isLoading =", isLoading);

  useEffect(() => {
    console.log("running effect: isAuthenticated =", isAuthenticated, " isLoading =", isLoading);
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
