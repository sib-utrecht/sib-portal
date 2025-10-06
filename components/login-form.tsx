"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "../contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUri = useMemo(() => searchParams.get("redirect_uri") || "/", [searchParams])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const success = await login(email, password)

    if (!success) {
      setError("Invalid email or password")
    } else {
      router.replace(redirectUri)
    }

    setIsLoading(false)
  }

  // If already signed in, bounce to redirectUri
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectUri)
    }
  }, [isAuthenticated, redirectUri, router])

  return (
    <div
      className="min-h-screen relative flex items-center justify-center overflow-hidden"
      // Local brand theming for this page only
      style={{
        // Using inline CSS custom properties so existing Tailwind variables (bg-primary, ring, etc.) pick up our brand color
        ["--primary" as any]: "#21526f",
        ["--primary-foreground" as any]: "#ffffff",
        ["--ring" as any]: "#21526f",
      }}
    >
      {/* Background: brand-forward gradient with a soft light spot */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,#6fb0cd33,transparent_60%),radial-gradient(800px_400px_at_90%_110%,#21526f22,transparent_60%),linear-gradient(135deg,#eaf5fb_0%,#d7eef8_25%,#c9e7f3_40%,#bfe0ee_55%,#a9d3e6_70%,#8fc2da_85%,#78b3cf_100%)] dark:bg-[radial-gradient(1200px_600px_at_10%_-10%,#6fb0cd22,transparent_60%),radial-gradient(800px_400px_at_90%_110%,#21526f33,transparent_60%),linear-gradient(135deg,#0b1216_0%,#102029_30%,#153544_70%,#1a4a61_100%)]" />

      <Card className="w-full max-w-md backdrop-blur-[2px] bg-card/90 border-[#21526f]/20 shadow-lg shadow-[#21526f]/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center">
            <img
              src="https://sib-utrecht.nl/wp-content/uploads/2025/04/Logo-44e-v3_512x512-150x150.png"
              alt="SIB Utrecht Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-[#21526f] via-[#2a6a88] to-[#58a6c7] bg-clip-text text-transparent">
              Member Login
            </span>
          </CardTitle>
          <CardDescription className="text-sm">
            Sign in to manage your photo permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full shadow-md shadow-[#21526f]/20 hover:shadow-[#21526f]/30"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Demo credentials:</strong>
            </p>
            <p>Member: john@example.com / password</p>
            <p>Admin: jane@example.com / password</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
