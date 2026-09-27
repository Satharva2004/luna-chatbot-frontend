"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MoonStar, ShieldCheck } from "lucide-react"

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
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh">
      {/* Left panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-zinc-950 lg:flex">
        <div className="absolute inset-0 overflow-hidden">
          <RotatingBackground
            images={["/bg1.png", "/bg2.jpg", "/bg3.jpg", "/bg4.jpg", "/bg5.jpg", "/bg6.jpg"]}
            alt="Luna background"
            className="animate-kenburns brightness-[0.45]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
        </div>

        <Link
          href="/chat"
          className="relative z-20 flex items-center gap-2.5 p-8"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-white text-black">
            <MoonStar className="size-4" />
          </div>
          <span className="text-sm font-semibold text-white">Luna AI</span>
        </Link>

        <div className="relative z-20 mt-auto p-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <blockquote className="text-sm leading-relaxed text-white/80">
              &ldquo;The best research assistant is the one that shows its
              work.&rdquo;
            </blockquote>
            <p className="mt-3 text-xs text-white/50">&mdash; The Luna team</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MoonStar className="size-5" />
            </div>
          </div>

          <LoginForm />

          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
            <ShieldCheck className="size-3.5" />
            <span>256-bit SSL encrypted</span>
          </div>
        </div>
      </div>
    </div>
  )
}
