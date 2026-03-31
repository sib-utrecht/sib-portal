import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { Trash2, ImageOff } from "lucide-react";

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {images === undefined ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white/60 shadow-sm">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="p-3 space-y-1.5">
                  <Skeleton className="h-3 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : images.length === 0 ? (
          <p className="text-gray-400 text-sm">No images stored yet.</p>
        ) : (
          <>
            <p className="text-xs font-semibold text-[#21526f] mb-5 flex items-center gap-2 uppercase tracking-widest">
              <span className="inline-block w-2 h-2 rounded-full bg-[#21526f]" />
              {images.length} image{images.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img) => (
                <ImageTile
                  key={img.storageId}
                  img={img}
                  isConfirming={confirmDelete === img.storageId}
                  deleting={deleting}
                  onRequestDelete={() => setConfirmDelete(img.storageId)}
                  onConfirmDelete={() => handleDelete(img.storageId as Id<"_storage">)}
                  onCancelDelete={() => setConfirmDelete(null)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ImageTile({
  img,
  isConfirming,
  deleting,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  img: {
    storageId: string;
    url: string | null;
    size?: number;
    uploadedAt: number;
    isCurrentImage: boolean;
    activity?: { _id: string; title: string } | null;
  };
  isConfirming: boolean;
  deleting: boolean;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <div
      className={`group rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-300
        ring-1 ring-[#21526f]/10 hover:ring-[#21526f]/25 hover:shadow-lg hover:shadow-[#21526f]/8 hover:-translate-y-0.5
        ${isConfirming ? "ring-red-300 shadow-red-100" : ""}`}
    >
      {/* Square image preview */}
      <div className="relative aspect-square bg-gradient-to-br from-[#c8e3ef] to-[#a3cfe0] overflow-hidden">
        {img.url ? (
          <img
            src={img.url}
            alt={img.activity?.title ?? "Deleted activity"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-[#21526f]/20" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          {img.isCurrentImage ? (
            <span className="bg-[#21526f] text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm">
              Current
            </span>
          ) : (
            <span className="bg-black/40 text-white/80 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full">
              Replaced
            </span>
          )}
        </div>

        {/* Delete controls */}
        <div className="absolute top-2 right-2">
          {isConfirming ? (
            <div className="flex flex-col gap-1">
              <Button
                variant="destructive"
                size="sm"
                className="text-[11px] px-2 h-6 shadow-sm"
                onClick={onConfirmDelete}
                disabled={deleting}
              >
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] px-2 h-6 bg-white/90 shadow-sm"
                onClick={onCancelDelete}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-white/80 hover:bg-red-50 text-red-500 border-red-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm"
              onClick={onRequestDelete}
              aria-label="Delete image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="px-3 py-2.5 space-y-0.5">
        {img.activity ? (
          <Link
            to={`/activities/${img.activity._id}`}
            className="block text-xs font-semibold text-[#21526f] truncate hover:underline leading-snug"
          >
            {img.activity.title}
          </Link>
        ) : (
          <p className="text-xs font-medium text-gray-400 italic truncate leading-snug">
            Deleted activity
          </p>
        )}
        <p className="text-[10px] text-gray-400">
          {formatBytes(img.size)} · {formatDate(img.uploadedAt)}
        </p>
      </div>
    </div>
  );
}

export default function StoragePage() {
  return <StorageContent />;
}
