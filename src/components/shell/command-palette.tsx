"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useAuth } from "@/contexts/auth-context"
import {
  MessageSquareIcon,
  SettingsIcon,
  LifeBuoyIcon,
  PlusIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
} from "lucide-react"

const pages = [
  { title: "Chat", url: "/chat", icon: <MessageSquareIcon /> },
  { title: "Settings", url: "/settings", icon: <SettingsIcon /> },
  { title: "Help & Support", url: "/support", icon: <LifeBuoyIcon /> },
]

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const { logout } = useAuth()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const run = React.useCallback((fn: () => void) => {
    setOpen(false)
    fn()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {pages.map((page) => (
            <CommandItem
              key={page.url}
              value={page.title}
              onSelect={() => run(() => router.push(page.url))}
            >
              {page.icon}
              <span>{page.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="New chat"
            onSelect={() => run(() => router.push("/chat?new=1"))}
          >
            <PlusIcon />
            <span>New chat</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="Toggle theme"
            onSelect={() =>
              run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
            }
          >
            {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
            <span>Toggle theme</span>
          </CommandItem>
          <CommandItem value="Log out" onSelect={() => run(logout)}>
            <LogOutIcon />
            <span>Log out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
