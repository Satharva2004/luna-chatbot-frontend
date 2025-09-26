"use client"

import { useState } from "react"
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

// Demo credentials
const DEMO_CREDENTIALS = {
        //nun
} as const

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { toast } = useToast()

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

  // Pre-fill form with demo credentials for testing

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* <div className="flex justify-center h-10">
        <div className="flex items-center w-40">
          <img src="original_v2-Photoroom.png" className="w-50" alt="nc" />
        </div>
      </div> */}
      <Card className="backdrop-blur-lg bg-opacity-80 dark:bg-opacity-80 bg-white/30 dark:bg-black/30 border border-white/20 dark:border-white/10 shadow-xl">
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
                <div className="text-center text-sm text-muted-foreground">
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
