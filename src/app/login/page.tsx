import { LoginForm } from "@/components/ui/login-form"

export default function Page() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#f0e8ff] via-[#e0c8ff] via-[#d0a8ff] via-[#b880ff] via-[#a048ff] via-[#9020ff] via-[#8000ff] via-[#7000e0] to-white dark:from-gray-950 dark:via-[#0f051f] dark:via-[#1a0a2e] dark:via-[#2a0a4e] dark:via-[#3a0a6e] dark:via-[#4a0a8e] dark:via-[#5a0aae] dark:via-[#6a0ace] dark:via-[#7a0aee] dark:to-white transition-all duration-1000">
          <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
