"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname, useRouter } from "next/navigation"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      const url = new URL("/login", window.location.origin)
      url.searchParams.set("redirect_uri", pathname || "/")
      router.replace(url.pathname + url.search)
    }
  }, [isAuthenticated, pathname, router])

  if (!isAuthenticated) return null
  return <>{children}</>
}
