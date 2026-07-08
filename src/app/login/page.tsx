"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
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
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs animate-fade-in-up">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden p-3 lg:block">
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-border/50 shadow-2xl">
          <RotatingBackground
            images={["/bg1.png", "/bg2.jpg", "/bg3.jpg", "/bg4.jpg", "/bg5.jpg", "/bg6.jpg"]}
            alt="Luna background"
            className="animate-kenburns dark:brightness-[0.75]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/10" />
          <div className="absolute inset-x-6 bottom-6">
            <div className="glass-morphism rounded-3xl p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Welcome back</p>
              <p className="mt-1 text-lg font-semibold leading-snug">
                Pick up right where your last conversation left off.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
