"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo, useEffect } from "react";
import { useAuth } from "../contexts/auth-context";

function ConvexAuthWrapper({
  convex,
  children,
}: {
  convex: ConvexReactClient;
  children: React.ReactNode;
}) {
  const { token } = useAuth();

  // Update Convex client with auth token whenever it changes
  useEffect(() => {
    if (token) {
      convex.setAuth(async () => token);
    } else {
      convex.clearAuth();
    }
  }, [token, convex]);

  return <>{children}</>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL;
    if (!url) {
      throw new Error(
        "Missing required environment variable: NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL"
      );
    }
    return new ConvexReactClient(url);
  }, []);

  return (
    <ConvexProvider client={convex}>
      <ConvexAuthWrapper convex={convex}>{children}</ConvexAuthWrapper>
    </ConvexProvider>
  );
}
