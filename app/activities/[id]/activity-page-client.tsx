import { useLayoutEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderAuthControls } from "@/components/header-auth-controls";
import { useAuth } from "@/contexts/auth-context";
import { ActivityDetailContent } from "./activity-detail-content";

export default function ActivityPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const slug = params.slug ?? "";

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function handleBack() {
    if (location.state?.fromActivities) {
      navigate(-1);
      return;
    }
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-[#21526f]">
      <header className="portal-header">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="border-[#21526f]/30 bg-white/80 text-[#21526f] shadow-sm hover:bg-[#eaf3f7] hover:text-[#21526f]"
                onClick={handleBack}
                aria-label="Back to activities"
                title="Back to activities"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <h1 className="portal-title text-2xl font-bold">Activity</h1>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-[#21526f] text-white shadow-sm shadow-[#21526f]/20 hover:bg-[#1a3f55]"
                >
                  <Link to={`/activities/${slug}/edit`}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit activity
                  </Link>
                </Button>
              )}
              <HeaderAuthControls />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <ActivityDetailContent slug={slug} />
      </main>
    </div>
  );
}
