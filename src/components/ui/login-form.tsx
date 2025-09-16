"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
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
import { toast } from "sonner"

// Dummy user credentials
const DUMMY_USERS = [
  { email: "student@example.com", password: "student123", role: "student" },
  { email: "teacher@example.com", password: "teacher123", role: "teacher" },
  { email: "admin@example.com", password: "admin123", role: "admin" },
]

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('token', data.token)
        toast.success('Login successful!')
        router.push('/')
      } else {
        throw new Error(data.message || 'Login failed')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Pre-fill form with demo credentials for testing
  const useDemoCredentials = (demoRole: 'student' | 'teacher' | 'admin') => {
    const demoUser = DUMMY_USERS.find(user => user.role === demoRole)
    if (demoUser) {
      setEmail(demoUser.email)
      setPassword(demoUser.password)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex justify-center h-10">
        <div className="flex items-center w-40">
          <img src="original_v2-Photoroom.png" className="w-50" alt="nc" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Eduvance</CardTitle>
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
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => useDemoCredentials('student')}
                    className="ml-auto text-xs text-muted-foreground hover:underline"
                  >
                  </button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
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
