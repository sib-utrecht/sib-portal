import { Link } from "react-router-dom";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

/** Authentication actions shared by portal-style page headers. */
export function HeaderAuthControls() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return isAuthenticated ? (
    <AccountMenu />
  ) : (
    <Button
      asChild
      size="sm"
      className="rounded-full bg-[#21526f] text-white shadow-sm shadow-[#21526f]/20 hover:bg-[#1a3f55]"
    >
      <Link to="/login">Log in</Link>
    </Button>
  );
}
