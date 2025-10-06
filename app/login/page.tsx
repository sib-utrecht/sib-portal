"use client"

import { LoginForm } from "@/components/login-form"
import { useSearchParams } from "next/navigation"

export default function LoginPage() {
  // The LoginForm reads redirect internally, but we keep this page client-only to ensure URL params are available immediately.
  useSearchParams() // ensure this page is a client component depending on search params
  return <LoginForm />
}
