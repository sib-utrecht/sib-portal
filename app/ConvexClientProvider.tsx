import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { useAuth } from "../contexts/auth-context";

function useCognitoAuthForConvex() {
  const { isLoading, isAuthenticated, fetchAccessToken } = useAuth();
  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    // Static Hosting injects VITE_CONVEX_URL for the deployment being built.
    // Keep the existing variable as a fallback for standalone/local builds.
    const url = import.meta.env.VITE_CONVEX_URL ?? import.meta.env.VITE_CONVEX_SELF_HOSTED_URL;
    if (!url) {
      throw new Error(
        "Missing required environment variable: VITE_CONVEX_URL or VITE_CONVEX_SELF_HOSTED_URL",
      );
    }
    return new ConvexReactClient(url);
  }, []);

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useCognitoAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}
