"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { AuthProvider, useAuth } from "../contexts/auth-context";
import { useEffect } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL;
if (!convexUrl) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL");
}
const convex = new ConvexReactClient(convexUrl);

function ConvexAuthWrapper({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();

  // Update Convex client with auth token whenever it changes
  useEffect(() => {
    if (token) {
      convex.setAuth(async () => token);
    } else {
      convex.clearAuth();
    }
  }, [token]);

  return <>{children}</>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        <ConvexAuthWrapper>{children}</ConvexAuthWrapper>
      </AuthProvider>
    </ConvexProvider>
  );
}
