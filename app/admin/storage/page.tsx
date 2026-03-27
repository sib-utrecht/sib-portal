"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/require-admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Trash2 } from "lucide-react";

function formatBytes(bytes: number | undefined) {
  if (bytes === undefined) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StorageContent() {
  const images = useQuery(api.activities.listActivityImages);
  const deleteImage = useMutation(api.activities.deleteStorageImage);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(storageId: Id<"_storage">, activityId: Id<"activities">) {
    setDeleting(true);
    setError(null);
    try {
      await deleteImage({ storageId, activityId });
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-4xl font-bold text-gray-900 underline decoration-4">
              Stored images
            </h1>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Back to admin</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {images === undefined ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <p className="text-gray-500">No images stored yet.</p>
        ) : (
          <div className="space-y-3">
            {images.map((img) => (
              <Card
                key={img.storageId}
                className="flex items-center gap-4 p-3 border-2 border-[#21526f] rounded-2xl"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {img.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt={img.activity.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">No URL</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-semibold text-gray-900 truncate">
                    <Link
                      href={`/activities/${img.activity._id}`}
                      className="hover:underline text-[#21526f]"
                    >
                      {img.activity.title}
                    </Link>
                  </p>
                  <p className="text-sm text-gray-500">
                    {img.contentType ?? "unknown type"} · {formatBytes(img.size)}
                  </p>
                  <p className="text-xs text-gray-400 font-mono truncate">{img.storageId}</p>
                </div>

                {/* Delete */}
                <div className="shrink-0">
                  {confirmDelete === img.storageId ? (
                    <div className="flex gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          handleDelete(
                            img.storageId as Id<"_storage">,
                            img.activity._id as Id<"activities">,
                          )
                        }
                        disabled={deleting}
                      >
                        Confirm delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setConfirmDelete(null)}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setConfirmDelete(img.storageId)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function StoragePage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <StorageContent />
      </RequireAdmin>
    </RequireAuth>
  );
}
