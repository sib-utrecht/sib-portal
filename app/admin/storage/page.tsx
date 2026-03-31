import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";

function formatBytes(bytes: number | undefined) {
  if (bytes === undefined) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StorageContent() {
  const images = useQuery(api.activities.listActivityImages);
  const deleteImage = useMutation(api.activities.deleteStorageImage);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(storageId: Id<"_storage">) {
    setDeleting(true);
    setError(null);
    try {
      await deleteImage({ storageId });
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen portal-bg">
      <header className="portal-header border-t-4 border-t-[#21526f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold portal-title">Stored images</h1>
            <Button asChild variant="outline" size="sm" className="border-[#21526f]/30 hover:bg-[#eaf3f7] hover:text-[#21526f]">
              <Link to="/admin">Back to admin</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {images === undefined ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : images.length === 0 ? (
          <p className="text-gray-500">No images stored yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img) => (
              <Card
                key={img.storageId}
                className="group flex flex-col border-2 border-[#21526f] rounded-2xl overflow-hidden"
              >
                {/* Square image preview */}
                <div className="relative aspect-square bg-muted flex items-center justify-center">
                  {img.url ? (
                    <img
                      src={img.url}
                      alt={img.activity?.title ?? "Deleted activity"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">No URL</span>
                  )}

                  {/* Delete overlay button */}
                  <div className="absolute top-1.5 right-1.5">
                    {confirmDelete === img.storageId ? (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs px-2 h-7"
                          onClick={() => handleDelete(img.storageId as Id<"_storage">)}
                          disabled={deleting}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 h-7 bg-white"
                          onClick={() => setConfirmDelete(null)}
                          disabled={deleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-white/80 hover:bg-red-50 text-red-600 border-red-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 transition-opacity"
                        onClick={() => setConfirmDelete(img.storageId)}
                        aria-label="Delete image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Metadata below the image */}
                <div className="p-2 space-y-0.5">
                  {img.activity ? (
                    <p className="text-xs font-semibold truncate">
                      <Link
                        to={`/activities/${img.activity._id}`}
                        className="hover:underline text-[#21526f]"
                      >
                        {img.activity.title}
                      </Link>
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-gray-400 italic truncate">
                      Deleted activity
                    </p>
                  )}
                  <div className="flex items-center gap-1">
                    {img.isCurrentImage ? (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-[#21526f]">
                        Current
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 text-gray-400 border-gray-300"
                      >
                        Replaced
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">{formatBytes(img.size)}</p>
                  <p className="text-[10px] text-gray-400">{formatDate(img.uploadedAt)}</p>
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
  return <StorageContent />;
}
