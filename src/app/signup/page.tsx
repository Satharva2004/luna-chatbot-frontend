"use client"

import Link from "next/link"
import { MoonStar, ShieldCheck } from "lucide-react"

import { SignupForm } from "@/components/ui/signup-form"
import { RotatingBackground } from "@/components/ui/rotating-background"

export default function SignupPage() {
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
          href="/login"
          className="relative z-20 flex items-center gap-2.5 p-8"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-white text-black">
            <MoonStar className="size-4" />
          </div>
          <span className="text-sm font-semibold text-white">Luna AI</span>
        </Link>

        <div className="relative z-20 mt-auto p-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Get started
            </p>
            <p className="mt-2 text-lg font-semibold leading-snug text-white">
              Join Luna and turn questions into understanding.
            </p>
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

          <SignupForm />

          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
            <ShieldCheck className="size-3.5" />
            <span>256-bit SSL encrypted</span>
          </div>
        </div>
      </div>
    </div>
  )
}
