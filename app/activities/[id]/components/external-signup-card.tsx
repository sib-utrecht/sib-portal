import { ExternalLink, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function safeHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export function ExternalSignupCard({
  url,
  signupOpen,
  authLoading,
  authenticated,
  loginUrl,
}: {
  url: string;
  signupOpen: boolean;
  authLoading: boolean;
  authenticated: boolean;
  loginUrl: string;
}) {
  const safeUrl = safeHttpUrl(url);
  return (
    <Card className="space-y-4 rounded-2xl p-6 shadow-sm shadow-[#21526f]/5">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-[#21526f]" />
        <h3 className="text-lg font-semibold">Sign up</h3>
      </div>
      <p className="text-sm text-gray-600">Sign-ups for this activity are managed externally.</p>
      {!signupOpen ? (
        <p className="text-sm text-gray-500">Registration is closed.</p>
      ) : !safeUrl ? (
        <p className="text-sm text-gray-500">Sign-up link is unavailable.</p>
      ) : authLoading ? (
        <Skeleton className="h-9 w-36 rounded-full" />
      ) : !authenticated ? (
        <Button asChild className="rounded-full bg-[#21526f] text-white hover:bg-[#1a3f55]">
          <Link to={loginUrl}>Log in to sign up</Link>
        </Button>
      ) : (
        <Button asChild className="rounded-full bg-[#21526f] text-white hover:bg-[#1a3f55]">
          <a href={safeUrl} target="_blank" rel="noopener noreferrer">
            Sign up
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      )}
    </Card>
  );
}
