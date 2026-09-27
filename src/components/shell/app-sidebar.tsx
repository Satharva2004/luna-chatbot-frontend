"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { NavUser } from "@/components/shell/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import {
  groupConversations,
  useConversations,
  type ConversationSummary,
} from "@/contexts/conversations-context"
import { cn } from "@/lib/utils"
import {
  MoonStarIcon,
  PlusIcon,
  SearchIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  CheckIcon,
  XIcon,
  SettingsIcon,
  LifeBuoyIcon,
} from "lucide-react"

/**
 * Dispatched when the sidebar mutates a conversation the chat page may be
 * showing, so the thread can reset itself without a full navigation.
 */
export const CONVERSATION_DELETED_EVENT = "luna:conversation-deleted"

/**
 * In-page navigation between the sidebar and the thread. Both live under the
 * same layout, so pushing a query string would not remount the chat page and
 * the action would be silently dropped; these events always land.
 */
export const OPEN_CONVERSATION_EVENT = "luna:open-conversation"
export const NEW_CHAT_EVENT = "luna:new-chat"

function ConversationRow({
  conversation,
  isActive,
  onOpen,
}: {
  conversation: ConversationSummary
  isActive: boolean
  onOpen: (id: string) => void
}) {
  const { token } = useAuth()
  const { removeLocal, renameLocal } = useConversations()
  const [isEditing, setIsEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(conversation.title)
  const [isBusy, setIsBusy] = React.useState(false)

  const commitRename = async () => {
    const title = draft.trim()
    if (!title || title === conversation.title) {
      setIsEditing(false)
      return
    }
    setIsBusy(true)
    try {
      const resp = await fetch(`/api/proxy/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title }),
      })
      if (!resp.ok) throw new Error(await resp.text())
      renameLocal(conversation.id, title)
      setIsEditing(false)
    } catch {
      toast.error("Could not rename that chat")
    } finally {
      setIsBusy(false)
    }
  }

  const commitDelete = async () => {
    setIsBusy(true)
    try {
      const resp = await fetch(`/api/proxy/conversations/${conversation.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!resp.ok) throw new Error(await resp.text())
      removeLocal(conversation.id)
      window.dispatchEvent(
        new CustomEvent(CONVERSATION_DELETED_EVENT, { detail: conversation.id })
      )
      toast.success("Chat deleted")
    } catch {
      toast.error("Could not delete that chat")
    } finally {
      setIsBusy(false)
    }
  }

  if (isEditing) {
    return (
      <SidebarMenuItem>
        <div className="flex items-center gap-1 px-1 py-0.5">
          <Input
            autoFocus
            value={draft}
            disabled={isBusy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitRename()
              if (e.key === "Escape") setIsEditing(false)
            }}
            className="h-7 text-xs"
          />
          <Button
            size="icon-sm"
            variant="ghost"
            className="size-7"
            aria-label="Save name"
            disabled={isBusy}
            onClick={() => void commitRename()}
          >
            <CheckIcon className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="size-7"
            aria-label="Cancel rename"
            onClick={() => setIsEditing(false)}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem className="group/row">
      <SidebarMenuButton
        isActive={isActive}
        onClick={() => onOpen(conversation.id)}
        tooltip={conversation.title}
        className="pr-8"
      >
        <span className="truncate">{conversation.title}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Options for ${conversation.title}`}
            className={cn(
              "absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-sidebar-foreground/60",
              "opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-foreground",
              "group-hover/row:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
            )}
          >
            <MoreHorizontalIcon className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-40">
          <DropdownMenuItem
            onClick={() => {
              setDraft(conversation.title)
              setIsEditing(true)
            }}
          >
            <PencilIcon />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => void commitDelete()}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()
  const { setOpenMobile, isMobile } = useSidebar()
  const {
    conversations,
    isLoading,
    searchResults,
    isSearching,
    query,
    setQuery,
  } = useConversations()

  const [activeId, setActiveId] = React.useState<string | null>(null)

  // Track which thread the chat page currently has open.
  React.useEffect(() => {
    const onOpened = (e: Event) =>
      setActiveId((e as CustomEvent<string | null>).detail ?? null)
    window.addEventListener("luna:conversation-opened", onOpened)
    return () => window.removeEventListener("luna:conversation-opened", onOpened)
  }, [])

  const rows = searchResults ?? conversations
  const groups = React.useMemo(
    () => (searchResults ? [{ label: "Results", items: searchResults }] : groupConversations(rows)),
    [searchResults, rows]
  )

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  const onChatRoute = pathname === "/chat"

  const openConversation = (id: string) => {
    closeMobile()
    setActiveId(id)
    if (onChatRoute) {
      window.dispatchEvent(new CustomEvent(OPEN_CONVERSATION_EVENT, { detail: id }))
    } else {
      router.push(`/chat?c=${encodeURIComponent(id)}`)
    }
  }

  const startNewChat = () => {
    closeMobile()
    setActiveId(null)
    if (onChatRoute) {
      window.dispatchEvent(new CustomEvent(NEW_CHAT_EVENT))
    } else {
      router.push("/chat?new=1")
    }
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/chat" onClick={closeMobile}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <MoonStarIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Luna AI</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Research assistant
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <Button
          onClick={startNewChat}
          className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <PlusIcon className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">New chat</span>
        </Button>

        <div className="relative group-data-[collapsible=icon]:hidden">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="h-8 bg-sidebar pl-8 text-xs"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="group-data-[collapsible=icon]:hidden">
        {isLoading || isSearching ? (
          <SidebarGroup>
            <div className="space-y-1.5 px-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-md" />
              ))}
            </div>
          </SidebarGroup>
        ) : groups.length === 0 ? (
          <SidebarGroup>
            <div className="px-2 py-6 text-center">
              <p className="text-xs font-medium">
                {query ? "No matches" : "No chats yet"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {query ? "Try a different search." : "Start one above."}
              </p>
            </div>
          </SidebarGroup>
        ) : (
          groups.map((group) => (
            <SidebarGroup key={group.label} className="py-1">
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((conversation) => (
                  <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    isActive={activeId === conversation.id}
                    onOpen={openConversation}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" asChild isActive={pathname === "/settings"}>
              <Link href="/settings" onClick={closeMobile}>
                <SettingsIcon />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" asChild isActive={pathname === "/support"}>
              <Link href="/support" onClick={closeMobile}>
                <LifeBuoyIcon />
                <span>Help &amp; Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
