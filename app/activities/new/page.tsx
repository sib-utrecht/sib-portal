"use client";

import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/require-admin";
import { ActivityForm } from "@/components/activity-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function NewActivityContent() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-4xl font-bold text-gray-900 underline decoration-4">
              New activity
            </h1>
            <Button asChild variant="outline" size="sm">
              <Link href="/activities">Back to activities</Link>
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
