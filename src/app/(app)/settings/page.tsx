"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

const MODELS = [
  {
    value: "gemini-2.5-flash-lite",
    label: "Fast",
    hint: "Lowest latency, good for quick lookups",
  },
  {
    value: "gemini-2.5-flash",
    label: "Smart",
    hint: "Balanced speed and reasoning",
  },
  {
    value: "gemini-2.5-pro",
    label: "Best",
    hint: "Deepest reasoning, slower responses",
  },
]

const THEMES = [
  { value: "light", label: "Light", icon: <SunIcon className="size-4" /> },
  { value: "dark", label: "Dark", icon: <MoonIcon className="size-4" /> },
  { value: "system", label: "System", icon: <MonitorIcon className="size-4" /> },
]

/** These keys are the same ones the chat surface reads on load. */
const KEYS = {
  model: "luna_model",
  youtube: "luna_yt",
  images: "luna_img",
} as const

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [model, setModel] = React.useState(MODELS[1].value)
  const [youtube, setYoutube] = React.useState(false)
  const [images, setImages] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    try {
      setModel(localStorage.getItem(KEYS.model) || MODELS[1].value)
      setYoutube(localStorage.getItem(KEYS.youtube) === "1")
      setImages(localStorage.getItem(KEYS.images) === "1")
    } catch {
      // storage unavailable, keep defaults
    }
  }, [])

  const persist = (key: string, value: string, message: string) => {
    try {
      localStorage.setItem(key, value)
      toast.success(message)
    } catch {
      toast.error("Could not save that preference")
    }
  }

  const name = user?.username || user?.name || "Guest"
  const email = user?.email || "Not signed in"
  const initials =
    (name || email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U"

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0 md:gap-6 md:p-6 md:pt-0">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and how Luna answers.
        </p>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Profile</CardTitle>
            <CardDescription>Your signed-in account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage
                  src={user?.profileImageUrl || user?.avatarUrl || ""}
                  alt={name}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
                {user?.role && (
                  <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {user.role}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={logout}
            >
              <LogOutIcon className="size-3.5" />
              Log out
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Default Model
            </CardTitle>
            <CardDescription>
              Used for new chats. You can still switch per message.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            {MODELS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setModel(m.value)
                  persist(KEYS.model, m.value, `Default model set to ${m.label}`)
                }}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                  model === m.value && "border-primary bg-muted/50"
                )}
              >
                <p className="text-sm font-medium">{m.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {m.hint}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Research Tools
            </CardTitle>
            <CardDescription>
              Extra sources Luna may pull into an answer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="yt-toggle">YouTube results</Label>
                <p className="text-xs text-muted-foreground">
                  Include relevant videos alongside written answers.
                </p>
              </div>
              <Switch
                id="yt-toggle"
                checked={youtube}
                onCheckedChange={(next) => {
                  setYoutube(next)
                  persist(
                    KEYS.youtube,
                    next ? "1" : "0",
                    next ? "YouTube results on" : "YouTube results off"
                  )
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="img-toggle">Image search</Label>
                <p className="text-xs text-muted-foreground">
                  Show supporting images from the web.
                </p>
              </div>
              <Switch
                id="img-toggle"
                checked={images}
                onCheckedChange={(next) => {
                  setImages(next)
                  persist(
                    KEYS.images,
                    next ? "1" : "0",
                    next ? "Image search on" : "Image search off"
                  )
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Appearance</CardTitle>
            <CardDescription>Theme for this browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/50",
                  mounted && theme === t.value && "border-primary bg-muted/50"
                )}
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {t.icon}
                </span>
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
