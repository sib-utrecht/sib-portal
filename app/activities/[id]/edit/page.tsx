"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/require-admin";
import { ActivityForm } from "@/components/activity-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

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

  return (
    <ActivityForm
      mode="edit"
      activityId={activityId}
      initial={activity}
    />
  );
}

export default function EditActivityPage() {
  const params = useParams();
  const activityId = params.id as Id<"activities">;

  return (
    <RequireAuth>
      <RequireAdmin>
        <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <h1 className="text-4xl font-bold text-gray-900 underline decoration-4">
                  Edit activity
                </h1>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/activities/${activityId}`}>Back to activity</Link>
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
