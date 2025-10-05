"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

const GoogleLogo = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path fill="#4285F4" d="M23.49 12.27c0-.78-.07-1.53-.21-2.27H12v4.3h6.43c-.28 1.43-1.14 2.64-2.43 3.45v2.85h3.93c2.3-2.12 3.56-5.24 3.56-8.33z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.93-2.85c-1.1.74-2.5 1.2-4.01 1.2-3.08 0-5.7-2.08-6.63-4.89H1.29v3.07C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.37 14.56c-.25-.74-.39-1.54-.39-2.35s.14-1.61.39-2.35V6.79H1.29C.47 8.3 0 10.09 0 12s.47 3.7 1.29 5.21l4.08-2.65z" />
    <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.6 4.6 1.78l3.43-3.43C17.94 1.14 15.22 0 12 0 7.31 0 3.26 2.7 1.29 6.79l4.08 2.47C6.3 6.83 8.92 4.75 12 4.75z" />
  </svg>
)

// Demo credentials
const DEMO_CREDENTIALS = {
        //nun
} as const

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { login, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === "undefined") return

    const existingScript = document.getElementById("google-identity-service")
    if (!existingScript) {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.id = "google-identity-service"
      document.body.appendChild(script)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter both email and password",
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      const { success, error } = await login(email, password)
      
      if (success) {
        toast({
          title: "Login successful!"
        })
        // The auth context will handle the redirect
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error || 'Login failed',
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred during login",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      // Ensure Google accounts SDK is available
      const { google } = window as typeof window & { google?: any }
      if (!google || !google.accounts || !google.accounts.oauth2) {
        toast({
          variant: "destructive",
          title: "Google SDK not loaded",
          description: "Please check your network connection and try again.",
        })
        return
      }

      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        toast({
          variant: "destructive",
          title: "Missing Google client ID",
          description: "Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.",
        })
        return
      }

      const client = google.accounts.oauth2.initCodeClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        ux_mode: "popup",
        callback: async (response: { code?: string; error?: string }) => {
          if (response.error || !response.code) {
            console.error("Google login error:", response.error)
            toast({
              variant: "destructive",
              title: "Google login failed",
              description: response.error || "The Google popup was closed before completing sign-in.",
            })
            setIsGoogleLoading(false)
            return
          }

          const result = await loginWithGoogle(response.code)
          if (!result.success) {
            setIsGoogleLoading(false)
          }
        },
      })

      client.requestCode()
    } catch (error) {
      console.error("Google sign-in error:", error)
      toast({
        variant: "destructive",
        title: "Google login failed",
        description: "An unexpected error occurred.",
      })
      setIsGoogleLoading(false)
    }
  }

  // Pre-fill form with demo credentials for testing

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex justify-center h-10">
        <div className="flex items-center w-40">
          <img src="logo 4.png" className="w-50" alt="nc" />
        </div>
      </div>
      <Card className="backdrop-blur-3xl bg-white/30 dark:bg-black/30 border border-white/10 dark:border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-4xl">
        <CardHeader>
          <CardTitle>Welcome to Luna</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="luna@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button disabled={isLoading} type="submit" className="w-full hover:shadow-lg transition-shadow">
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full hover:shadow-lg transition-shadow gap-2"
                >
                  <GoogleLogo />
                  <span>{isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
                </Button>
                <div className="text-center text-sm text-primary">
                  Don&apos;t have an account?{' '}
                  <a 
                    href="/signup" 
                    className="text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push('/signup');
                    }}
                  >
                    Sign up
                  </a>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
