"use client";

import { useState, useMemo } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Search } from "lucide-react";
import { RequireAuth } from "../../components/require-auth";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { PhotoPermission } from "../../types/user";

type FilterType = "all" | "internal+external" | "internal" | "nowhere";

const permissionColors: Record<PhotoPermission, { bg: string; label: string }> = {
  "internal+external": { bg: "bg-[#8dd4b8]", label: "Internal + External" },
  internal: { bg: "bg-[#e57373]", label: "Internal only" },
  nowhere: { bg: "bg-[#f4a896]", label: "No permissions" },
};

export default function PhotoPermissionsPage() {
  const users = useQuery(api.users.getUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const loading = users === undefined;

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let filtered = [...users];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
      );
    }

    if (activeFilter !== "all") {
      filtered = filtered.filter((u) => u.photoPermission === activeFilter);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchQuery, activeFilter]);

  const renderPermissionDot = (permission: PhotoPermission) => {
    const config = permissionColors[permission];
    if (!config) return null;
    return <div className={`w-8 h-8 rounded-full ${config.bg} shrink-0`} title={config.label} />;
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-4xl font-bold text-gray-900 underline decoration-4">
                Foto permissions
              </h1>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="search...."
                  className="pl-12 h-14 text-lg bg-[#6fa8c4] placeholder:text-gray-700 text-gray-900 border-2 border-[#5a8ba3] rounded-full focus-visible:ring-[#21526f]"
                />
              </div>

              <Card className="p-6 border-4 border-[#21526f] rounded-3xl shadow-lg">
                {loading ? (
                  <div className="text-center py-12 text-gray-500">Loading members...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No members found</div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-4 bg-[#6fa8c4] rounded-full hover:bg-[#5a8ba3] transition-colors"
                      >
                        <span className="text-lg font-semibold text-gray-900">{user.name}</span>
                        {renderPermissionDot(user.photoPermission)}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="w-80 space-y-4">
              <Button
                onClick={() => setActiveFilter("all")}
                className={`w-full h-20 text-xl font-bold rounded-3xl transition-all ${
                  activeFilter === "all"
                    ? "bg-[#81b9d5] hover:bg-[#71a9c5] text-gray-900 border-4 border-gray-900"
                    : "bg-[#81b9d5] hover:bg-[#71a9c5] text-gray-900 border-2 border-transparent"
                }`}
              >
                All
              </Button>

              <Button
                onClick={() => setActiveFilter("internal+external")}
                className={`w-full h-20 text-xl font-bold rounded-3xl transition-all ${
                  activeFilter === "internal+external"
                    ? "bg-[#8dd4b8] hover:bg-[#7ac4a8] text-gray-900 border-4 border-gray-900"
                    : "bg-[#8dd4b8] hover:bg-[#7ac4a8] text-gray-900 border-2 border-transparent"
                }`}
              >
                Internally & Externally
              </Button>

              <Button
                onClick={() => setActiveFilter("internal")}
                className={`w-full h-20 text-xl font-bold rounded-3xl transition-all ${
                  activeFilter === "internal"
                    ? "bg-[#e57373] hover:bg-[#d66363] text-gray-900 border-4 border-gray-900"
                    : "bg-[#e57373] hover:bg-[#d66363] text-gray-900 border-2 border-transparent"
                }`}
              >
                Internally
              </Button>

              <Button
                onClick={() => setActiveFilter("nowhere")}
                className={`w-full h-20 text-xl font-bold rounded-3xl transition-all ${
                  activeFilter === "nowhere"
                    ? "bg-[#f4a896] hover:bg-[#e39886] text-gray-900 border-4 border-gray-900"
                    : "bg-[#f4a896] hover:bg-[#e39886] text-gray-900 border-2 border-transparent"
                }`}
              >
                No permissions
              </Button>
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
