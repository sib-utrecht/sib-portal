import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/require-admin";
import { ActivityForm } from "@/components/activity-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

function EditActivityContent({ activityId }: { activityId: Id<"activities"> }) {
  const activity = useQuery(api.activities.getActivity, { id: activityId });

  if (activity === undefined) {
    return (
      <div className="space-y-4 max-w-2xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    );
  }

  if (activity === null) {
    return <p className="text-gray-500">Activity not found.</p>;
  }

  return <ActivityForm mode="edit" activityId={activityId} initial={activity} />;
}

export default function EditActivityPage() {
  const params = useParams();
  const activityId = params.id as Id<"activities">;

  return (
    <RequireAuth>
      <RequireAdmin>
        <div className="min-h-screen portal-bg">
          <header className="portal-header">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <h1 className="text-2xl font-bold portal-title">Edit activity</h1>
                <Button asChild variant="outline" size="sm" className="border-[#21526f]/30 hover:bg-[#eaf3f7] hover:text-[#21526f]">
                  <Link to={`/activities/${activityId}`}>Back to activity</Link>
                </Button>
              </div>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EditActivityContent activityId={activityId} />
          </main>
        </div>
      </RequireAdmin>
    </RequireAuth>
  );
}
