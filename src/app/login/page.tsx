"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { GalleryVerticalEnd } from "lucide-react"
import { Loader2 } from "lucide-react"

import { LoginForm } from "@/components/ui/login-form"
import { RotatingBackground } from "@/components/ui/rotating-background"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/chat")
    }
  }, [isLoading, user, router])

  if (!isLoading && user) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to chat…</p>
      </div>
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Luna AI.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <RotatingBackground
          images={["/bg1.png", "/bg2.jpg", "/bg3.jpg", "/bg4.jpg", "/bg5.jpg", "/bg6.jpg"]}
          alt="Luna background"
          className="dark:brightness-[0.8] dark:grayscale"
        />
      </div>
    </div>
  )
}
