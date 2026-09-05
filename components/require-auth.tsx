import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate, useLocation } from "react-router-dom";
import { useConvexAuth } from "convex/react";

/**
 * Route guard that redirects unauthenticated users to the login page.
 *
 * While the auth state is still loading a placeholder is rendered.  Once
 * loading completes, unauthenticated visitors are redirected to `/login` with
 * the current path appended as `?redirect_uri=…` so they land back here after
 * signing in.  Authenticated users see the wrapped `children` as normal.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const cognitoAuth = useAuth();
  const convexAuth = useConvexAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoading = cognitoAuth.isLoading || (cognitoAuth.isAuthenticated && convexAuth.isLoading);
  const isAuthenticated = cognitoAuth.isAuthenticated && convexAuth.isAuthenticated;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const fullPath = location.pathname + location.search + location.hash;
      navigate(`/login?redirect_uri=${encodeURIComponent(fullPath)}`, { replace: true });
    }
  }, [isAuthenticated, location, navigate, isLoading]);
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
