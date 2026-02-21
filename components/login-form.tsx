"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "../contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Mail } from "lucide-react";
import Link from "next/link";

// export function LoginForm() {
//     const router = useRouter()
//     const searchParams = useSearchParams()
//     const redirectUri = useMemo(() => searchParams.get("redirect_uri") || "/", [searchParams])
//
//     const [email, setEmail] = useState("")
//     const [password, setPassword] = useState("")
//     // const [error, setError] = useState("")
//     // const [isLoading, setIsLoading] = useState(false)
//     const [rememberMe, setRememberMe] = useState(false)
//     const { login, requestPasswordlessCode, loginWithCode, error, isLoading } = useAuth();
//     // const users = useQuery(api.users.getUsers);
//
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault()
//
//         try {
//             await login(email, password);
//         } catch (err) {
//             console.error("Login failed: ", err);
//         }
//         // if (!success) {
//         //     setError("Invalid email or password")
//         // } else {
//         //     router.replace(redirectUri)
//         // }
//     }
//
//     // // If already signed in, bounce to redirectUri
//     // useEffect(() => {
//     // 	if (isAuthenticated) {
//     // 		router.replace(redirectUri)
//     // 	}
//     // }, [isAuthenticated, redirectUri, router])
//     // Initialize remember-me preference from localStorage
//     useEffect(() => {
//         try {
//             const saved = localStorage.getItem("rememberMe")
//             if (saved !== null) {
//                 setRememberMe(saved === "true")
//             }
//         } catch (e) {
//             // ignore storage errors
//         }
//     }, [])
//
//     // Persist remember-me preference
//     useEffect(() => {
//         try {
//             localStorage.setItem("rememberMe", String(rememberMe))
//         } catch (e) {
//             // ignore storage errors
//         }
//     }, [rememberMe])
//
//     return (
//         <div
//             className="min-h-screen relative flex items-center justify-center overflow-hidden"
//             // Local brand theming for this page only
//             style={{
//                 // Using inline CSS custom properties so existing Tailwind variables (bg-primary, ring, etc.) pick up our brand color
//                 ["--primary" as any]: "#21526f",
//                 ["--primary-foreground" as any]: "#ffffff",
//                 ["--ring" as any]: "#21526f",
//             }}
//         >
//             {/* Background: brand-forward gradient with a soft light spot */}
//             <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,#6fb0cd33,transparent_60%),radial-gradient(800px_400px_at_90%_110%,#21526f22,transparent_60%),linear-gradient(135deg,#eaf5fb_0%,#d7eef8_25%,#c9e7f3_40%,#bfe0ee_55%,#a9d3e6_70%,#8fc2da_85%,#78b3cf_100%)] dark:bg-[radial-gradient(1200px_600px_at_10%_-10%,#6fb0cd22,transparent_60%),radial-gradient(800px_400px_at_90%_110%,#21526f33,transparent_60%),linear-gradient(135deg,#0b1216_0%,#102029_30%,#153544_70%,#1a4a61_100%)]" />
//
//             <Card className="w-full max-w-md backdrop-blur-[2px] bg-card/90 border-[#21526f]/20 shadow-lg shadow-[#21526f]/10">
//                 <CardHeader className="text-center">
//                     <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center">
//                         <img
//                             src="https://sib-utrecht.nl/wp-content/uploads/2025/04/Logo-44e-v3_512x512-150x150.png"
//                             alt="SIB Utrecht Logo"
//                             className="h-full w-full object-contain"
//                         />
//                     </div>
//                     <CardTitle className="text-2xl font-semibold tracking-tight">
//                         <span className="bg-gradient-to-r from-[#21526f] via-[#2a6a88] to-[#58a6c7] bg-clip-text text-transparent">
//                             Member Login
//                         </span>
//                     </CardTitle>
//                     <CardDescription className="text-sm">
//                         Sign in to manage your photo permissions
//                     </CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                     <form onSubmit={handleSubmit} className="space-y-4">
//                         <div className="space-y-2">
//                             <Label htmlFor="email">Email</Label>
//                             <Input
//                                 id="email"
//                                 type="email"
//                                 value={email}
//                                 onChange={(e) => setEmail(e.target.value)}
//                                 placeholder="Enter your email"
//                                 required
//                             />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="password">Password</Label>
//                             <Input
//                                 id="password"
//                                 type="password"
//                                 value={password}
//                                 onChange={(e) => setPassword(e.target.value)}
//                                 placeholder="Enter your password"
//                                 required
//                             />
//                         </div>
//                         {error && (
//                             <Alert variant="destructive">
//                                 <AlertDescription>{error}</AlertDescription>
//                             </Alert>
//                         )}
//                         <Button
//                             type="submit"
//                             className="w-full shadow-md shadow-[#21526f]/20 hover:shadow-[#21526f]/30"
//                             disabled={isLoading}
//                         >
//                             {isLoading ? "Signing in..." : "Sign In"}
//                         </Button>
//                     </form>
//                 </CardContent>
//             </Card>
//         </div >
//     )
//
//     // return (
//     //   <div
//     //     className="min-h-screen relative flex items-center justify-center overflow-hidden"
//     //     // Local brand theming for this page only
//     //     style={{
//     //       // Using inline CSS custom properties so existing Tailwind variables (bg-primary, ring, etc.) pick up our brand color
//     //       ["--primary" as any]: "#21526f",
//     //       ["--primary-foreground" as any]: "#ffffff",
//     //       ["--ring" as any]: "#21526f",
//     //     }}
//     //   >
//     //     {/* Background: brand-forward gradient with a soft light spot */}
//     //     <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,#6fb0cd33,transparent_60%),radial-gradient(800px_400px_at_90%_110%,#21526f22,transparent_60%),linear-gradient(135deg,#eaf5fb_0%,#d7eef8_25%,#c9e7f3_40%,#bfe0ee_55%,#a9d3e6_70%,#8fc2da_85%,#78b3cf_100%)] dark:bg-[radial-gradient(1200px_600px_at_10%_-10%,#6fb0cd22,transparent_60%),radial-gradient(800px_400px_at_90%_110%,#21526f33,transparent_60%),linear-gradient(135deg,#0b1216_0%,#102029_30%,#153544_70%,#1a4a61_100%)]" />
//     //
//     //     <Card className="w-full max-w-md backdrop-blur-[2px] bg-card/90 border-[#21526f]/20 shadow-lg shadow-[#21526f]/10">
//     //       <CardHeader className="text-center">
//     //         <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center">
//     //           <img
//     //             src="https://sib-utrecht.nl/wp-content/uploads/2025/04/Logo-44e-v3_512x512-150x150.png"
//     //             alt="SIB Utrecht Logo"
//     //             className="h-full w-full object-contain"
//     //           />
//     //         </div>
//     //         <CardTitle className="text-2xl font-semibold tracking-tight">
//     //           <span className="bg-gradient-to-r from-[#21526f] via-[#2a6a88] to-[#58a6c7] bg-clip-text text-transparent">
//     //             SIB-Utrecht
//     //           </span>
//     //         </CardTitle>
//     //         <CardDescription className="text-sm">
//     //           Sign in with a password, or with a login code sent to your email.
//     //         </CardDescription>
//     //       </CardHeader>
//     //       <CardContent>
//     //         <form onSubmit={handleSubmit} className="space-y-4">
//     //           <div className="space-y-2">
//     //             <Label htmlFor="email">Email</Label>
//     //             <Input
//     //               id="email"
//     //               type="email"
//     //               value={email}
//     //               onChange={(e) => setEmail(e.target.value)}
//     //               placeholder="Enter your email"
//     //               required
//     //             />
//     //           </div>
//     //           <div className="space-y-2">
//     //             <Label htmlFor="password">Password</Label>
//     //             <Input
//     //               id="password"
//     //               type="password"
//     //               value={password}
//     //               onChange={(e) => setPassword(e.target.value)}
//     //               placeholder="Enter your password"
//     //               required
//     //             />
//     //           </div>
//     //           <div className="flex items-center justify-between text-sm">
//     //             <label htmlFor="remember" className="flex items-center select-none">
//     //               <input
//     //                 id="remember"
//     //                 type="checkbox"
//     //                 className="mr-2 h-4 w-4 rounded border-gray-300 text-[#21526f] focus:ring-[#21526f] accent-[#21526f]"
//     //                 checked={rememberMe}
//     //                 onChange={(e) => setRememberMe(e.target.checked)}
//     //               />
//     //               Keep me logged in
//     //             </label>
//     //             <Link href="/login/reset" className="text-[#21526f] hover:underline font-medium">
//     //               Reset password
//     //             </Link>
//     //           </div>
//     //           {error && (
//     //             <Alert variant="destructive">
//     //               <AlertDescription>{error}</AlertDescription>
//     //             </Alert>
//     //           )}
//     //           <Button
//     //             type="submit"
//     //             className="w-full shadow-md shadow-[#21526f]/20 hover:shadow-[#21526f]/30"
//     //             disabled={isLoading}
//     //           >
//     //             {isLoading ? "Signing in..." : "Sign In"}
//     //           </Button>
//     //         </form>
//     //         <div className="mt-4 text-sm text-gray-600">
//     //           <p>
//     //             <strong>Demo credentials:</strong>
//     //           </p>
//     //           <p>Member: john@example.com / password</p>
//     //           <p>Admin: jane@example.com / password</p>
//     //         </div>
//     //       </CardContent>
//     //       <CardContent>
//     //         {/* Additional actions */}
//     //         <div className="mt-4">
//     //           <Button
//     //             type="button"
//     //             variant="outline"
//     //             className="w-full"
//     //             onClick={() => {
//     //               // TODO: Implement email magic-code flow
//     //             }}
//     //           >
//     //             <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
//     //             <span>Get login code by email</span>
//     //           </Button>
//     //         </div>
//     //       </CardContent>
//     //     </Card>
//     //   </div>
//     // )
// }
//
type LoginMode = "password" | "code" | "code-sent";

export function LoginForm() {
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const router = useRouter();
  const { login, requestPasswordlessCode, loginWithCode, error, isLoading } = useAuth();
  // const navigate = useNavigate();
  // const location = useLocation();

  // const from = (location.state as { from?: string })?.from || "/orders";

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      // navigate(from, { replace: true });
      router.replace("/");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestPasswordlessCode(email);
      setMode("code-sent");
    } catch (err) {
      console.error("Failed to send code:", err);
    }
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithCode(email, code);
      // navigate(from, { replace: true });
      router.replace("/");
    } catch (err) {
      console.error("Code login failed:", err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login with Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode("code")}
                  disabled={isLoading}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Login with Email Code
                </Button>
              </form>
            )}

            {mode === "code" && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode("password")}
                  disabled={isLoading}
                >
                  Back to Password Login
                </Button>
              </form>
            )}

            {mode === "code-sent" && (
              <form onSubmit={handleCodeLogin} className="space-y-4">
                <div className="bg-primary/10 text-primary text-sm p-3 rounded-md mb-4">
                  A verification code has been sent to {email}
                </div>
                <div>
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter the code from your email"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify Code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode("code")}
                  disabled={isLoading}
                >
                  Resend Code
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
