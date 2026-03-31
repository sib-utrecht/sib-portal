import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/require-admin";
import { ActivityForm } from "@/components/activity-form";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function NewActivityContent() {
  return (
    <div className="min-h-screen portal-bg">
      <header className="portal-header">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold portal-title">New activity</h1>
            <Button asChild variant="outline" size="sm" className="border-[#21526f]/30 hover:bg-[#eaf3f7] hover:text-[#21526f]">
              <Link to="/activities">Back to activities</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ActivityForm mode="create" />
      </main>
    </div>
  );
}

export default function NewActivityPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <NewActivityContent />
      </RequireAdmin>
    </RequireAuth>
  );
}
