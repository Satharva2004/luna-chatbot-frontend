"use client"

import { SignupForm } from "@/components/ui/signup-form"
import { RotatingBackground } from "@/components/ui/rotating-background"

export default function SignupPage() {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs animate-fade-in-up">
            <SignupForm />
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
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Get started</p>
              <p className="mt-1 text-lg font-semibold leading-snug">
                Join Luna and turn questions into understanding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}