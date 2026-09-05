import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, LogIn, RefreshCw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

type BoundaryProps = {
  children: ReactNode;
  resetKey: string;
  onSignIn: () => void;
};

type BoundaryState = { error: Error | null };

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Portal page failed to render:", error, info);
  }

  componentDidUpdate(previousProps: BoundaryProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-[#21526f] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-[#21526f]/10">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-[#21526f]" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-gray-900">We couldn’t load this page</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your connection or session may have been interrupted. You can retry safely, or sign in
            again if the problem continues.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => this.setState({ error: null })}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" onClick={this.props.onSignIn}>
              <LogIn className="h-4 w-4" />
              Sign in again
            </Button>
          </div>
        </div>
      </main>
    );
  }
}

/** Catches query/render failures and resets automatically after navigation or token renewal. */
export function PortalErrorBoundary({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const resetKey = `${location.pathname}${location.search}:${token ?? "signed-out"}`;

  const signInAgain = () => {
    const redirectUri = `${location.pathname}${location.search}${location.hash}`;
    logout();
    navigate(`/login?redirect_uri=${encodeURIComponent(redirectUri)}`, { replace: true });
  };

  return (
    <ErrorBoundary resetKey={resetKey} onSignIn={signInAgain}>
      {children}
    </ErrorBoundary>
  );
}
