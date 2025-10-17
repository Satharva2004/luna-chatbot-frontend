"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { loginWithGoogle } = useAuth()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
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

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Input validation
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Username is required",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 
          data.error || 
          (response.status === 400 ? 'Invalid request data' : 'Registration failed')
        );
      }

      // Clear form on success
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      toast({
        title: "Success!",
        description: "Account created successfully. Redirecting to login...",
        variant: "default",
      });

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 1500);

    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'An error occurred during registration';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle common error cases
        if (errorMessage.includes('already exists')) {
          if (errorMessage.toLowerCase().includes('email')) {
            errorMessage = 'This email is already registered';
          } else if (errorMessage.toLowerCase().includes('username')) {
            errorMessage = 'This username is already taken';
          }
        }
      }

      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignup = async () => {
    try {
      setIsGoogleLoading(true)

      const { google } = window as typeof window & { google?: any }
      if (!google || !google.accounts || !google.accounts.oauth2) {
        toast({
          variant: "destructive",
          title: "Google SDK not loaded",
          description: "Please check your network connection and try again.",
        })
        setIsGoogleLoading(false)
        return
      }

      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        toast({
          variant: "destructive",
          title: "Missing Google client ID",
          description: "Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.",
        })
        setIsGoogleLoading(false)
        return
      }

      const client = google.accounts.oauth2.initCodeClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        ux_mode: "popup",
        callback: async (response: { code?: string; error?: string }) => {
          if (response.error || !response.code) {
            console.error("Google sign-up error:", response.error)
            toast({
              variant: "destructive",
              title: "Google sign-up failed",
              description: response.error || "The Google popup was closed before finishing sign-up.",
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
      console.error("Google sign-up error:", error)
      toast({
        variant: "destructive",
        title: "Google sign-up failed",
        description: "An unexpected error occurred.",
      })
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Create an account</h1>
            {/* <p className="text-muted-foreground text-sm text-balance">
              Enter your details to create a new account
            </p> */}
          </div>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="Aarya Kadam"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </Field>
          <Field>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </Field>
          <FieldSeparator>Or continue with</FieldSeparator>
          <Field>
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignup}
              disabled={isGoogleLoading}
              className="w-full gap-2"
            >
              <GoogleLogo />
              <span>{isGoogleLoading ? "Connecting..." : "Sign up with Google"}</span>
            </Button>
            <FieldDescription className="text-center">
              Already have an account?{" "}
              <a
                href="/login"
                className="underline underline-offset-4"
                onClick={(e) => {
                  e.preventDefault()
                  router.push("/login")
                }}
              >
                Sign in
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
