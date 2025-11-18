"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Card } from "../../components/ui/card"
import { Search } from "lucide-react"
import { RequireAuth } from "../../components/require-auth"
import Link from "next/link"
import { createClient } from "../../lib/supabase-client"

type FilterType = "all" | "internal+external" | "internal" | "no_permissions" | "past_members" | "extra_comments"

interface Member {
  id: string
  name: string
  email: string
  is_active: boolean
}

interface PhotoPermission {
  id: string
  member_id: string
  internal_external: boolean
  internal_only: boolean
  no_permissions: boolean
  no_alcohol: boolean
  no_audio: boolean
  not_prominently: boolean
  no_social_media: boolean
  no_tiktok: boolean
  extra_comments: string | null
}

interface MemberWithPermissions extends Member {
  photo_permissions: PhotoPermission | null
}

export default function PhotoPermissionsPage() {
  const [members, setMembers] = useState<MemberWithPermissions[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("members")
        .select(`
          *,
          photo_permissions (*)
        `)
        .order("name")

      if (error) throw error

      const membersWithPermissions = (data || []).map((member: any) => ({
        ...member,
        photo_permissions: Array.isArray(member.photo_permissions)
          ? member.photo_permissions[0] || null
          : member.photo_permissions
      }))

      setMembers(membersWithPermissions)
    } catch (error) {
      console.error("Error fetching members:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = useMemo(() => {
    let filtered = members

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      )
    }

    if (activeFilter === "internal+external") {
      filtered = filtered.filter(m => m.photo_permissions?.internal_external)
    } else if (activeFilter === "internal") {
      filtered = filtered.filter(m => m.photo_permissions?.internal_only)
    } else if (activeFilter === "no_permissions") {
      filtered = filtered.filter(m => m.photo_permissions?.no_permissions)
    } else if (activeFilter === "past_members") {
      filtered = filtered.filter(m => !m.is_active)
    } else if (activeFilter === "extra_comments") {
      filtered = filtered.filter(m => m.photo_permissions?.extra_comments)
    }

    return filtered
  }, [members, searchQuery, activeFilter])

  const renderPermissionDots = (permissions: PhotoPermission | null) => {
    if (!permissions) return null

    const dots = []

    if (permissions.no_alcohol) {
      dots.push(
        <div key="no-alcohol" className="w-8 h-8 rounded-full bg-[#2c5f7a] shrink-0" title="No alcohol" />
      )
    }

    if (permissions.no_audio) {
      dots.push(
        <div key="no-audio" className="w-8 h-8 rounded-full bg-[#c95d9e]" title="No audio" />
      )
    }

    if (permissions.internal_external) {
      dots.push(
        <div key="internal-external" className="w-8 h-8 rounded-full bg-[#8dd4b8]" title="Internal + External" />
      )
    }

    if (permissions.no_permissions) {
      dots.push(
        <div key="no-permissions" className="w-8 h-8 rounded-full bg-[#f4a896]" title="No permissions" />
      )
    }

    if (permissions.not_prominently) {
      dots.push(
        <div key="not-prominently" className="w-8 h-8 rounded-full bg-[#f2b8d4]" title="Not prominently" />
      )
    }

    return <div className="flex gap-2 items-center">{dots}</div>
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f0f7fb_0%,#ffffff_60%)]">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-4xl font-bold text-gray-900 underline decoration-4">Foto permissions</h1>
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
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No members found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-[#6fa8c4] rounded-full hover:bg-[#5a8ba3] transition-colors"
                      >
                        <span className="text-lg font-semibold text-gray-900">{member.name}</span>
                        {renderPermissionDots(member.photo_permissions)}
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
                    ? "bg-[#8dd4b8] hover:bg-[#7ac4a8] text-gray-900 border-4 border-gray-900"
                    : "bg-[#8dd4b8] hover:bg-[#7ac4a8] text-gray-900 border-2 border-transparent"
                }`}
              >
                All permissions
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
                onClick={() => setActiveFilter("no_permissions")}
                className={`w-full h-20 text-xl font-bold rounded-3xl transition-all ${
                  activeFilter === "no_permissions"
                    ? "bg-[#f4a896] hover:bg-[#e39886] text-gray-900 border-4 border-gray-900"
                    : "bg-[#f4a896] hover:bg-[#e39886] text-gray-900 border-2 border-transparent"
                }`}
              >
                No permissions
              </Button>

              <Button
                onClick={() => setActiveFilter("past_members")}
                className={`w-full h-20 text-xl font-bold rounded-3xl transition-all ${
                  activeFilter === "past_members"
                    ? "bg-[#b590ca] hover:bg-[#a580ba] text-gray-900 border-4 border-gray-900"
                    : "bg-[#b590ca] hover:bg-[#a580ba] text-gray-900 border-2 border-transparent"
                }`}
              >
                Past members
              </Button>

              <Button
                onClick={() => setActiveFilter("extra_comments")}
                className={`w-full h-20 text-xl font-bold rounded-3xl transition-all ${
                  activeFilter === "extra_comments"
                    ? "bg-[#81b9d5] hover:bg-[#71a9c5] text-gray-900 border-4 border-gray-900"
                    : "bg-[#81b9d5] hover:bg-[#71a9c5] text-gray-900 border-2 border-transparent"
                }`}
              >
                Extra comments
              </Button>
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  )
}
