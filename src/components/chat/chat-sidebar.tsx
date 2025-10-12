"use client"

import * as React from "react"
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { History, LogOut, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react"

export type ChatSidebarConversation = {
  id: string
  title: string
  updated_at: string | null
  created_at: string | null
}

export type ChatSidebarProps = {
  userName?: string | null
  userEmail?: string | null
  onStartNewChat: () => void
  onLogout: () => void
  conversations: ChatSidebarConversation[]
  currentConversationId: string | null
  formatDate: (iso?: string | null) => string
  isHistoryLoading: boolean
  onRefreshHistory: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string, event: React.MouseEvent<HTMLButtonElement>) => void
  loadingConversationId: string | null
}

export function ChatSidebar({
  userName,
  userEmail,
  onStartNewChat,
  onLogout,
  conversations,
  currentConversationId,
  formatDate,
  isHistoryLoading,
  onRefreshHistory,
  onSelectConversation,
  onDeleteConversation,
  loadingConversationId,
}: ChatSidebarProps) {
  const userInitial = React.useMemo(() => {
    return (userEmail || userName)?.slice(0, 1)?.toUpperCase() ?? "U"
  }, [userEmail, userName])

  return (
    <>
      <SidebarHeader className="border-b border-border/40 px-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f0f13] to-[#1d1f24] shadow-[0_6px_18px_rgba(11,12,17,0.35)] dark:from-white/85 dark:to-white/65 dark:shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
              <Sparkles className="h-4 w-4 text-white dark:text-[#0c0c12]" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">Luna Research</span>
              <span className="text-xs text-muted-foreground">Powered by AI</span>
            </div>
          </div>
          <SidebarTrigger className="md:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-[0.15em] text-muted-foreground/90">
            Quick actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2">
              <Button
                onClick={onStartNewChat}
                className="w-full justify-between"
                variant="default"
                size="sm"
              >
                <span>New chat</span>
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                onClick={onRefreshHistory}
                className="w-full justify-between"
                variant="outline"
                size="sm"
                disabled={isHistoryLoading}
              >
                <span>Refresh history</span>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                onClick={onLogout}
                className="w-full justify-between"
                variant="ghost"
                size="sm"
              >
                <span>Log out</span>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground/90">
            <History className="h-3.5 w-3.5" />
            History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {isHistoryLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SidebarMenuSkeleton key={index} showIcon />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-md border border-border/40 bg-muted/50 p-3 text-xs text-muted-foreground">
                No conversations yet.
              </div>
            ) : (
              <SidebarMenu>
                {conversations.map((conversation) => {
                  const timestamp = formatDate(
                    conversation.updated_at ?? conversation.created_at ?? undefined
                  )
                  const isActive = currentConversationId === conversation.id

                  return (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectConversation(conversation.id)}
                        isActive={isActive}
                        tooltip={conversation.title}
                        className="items-start gap-2 text-left"
                      >
                        <div className="flex flex-1 flex-col overflow-hidden">
                          <span className="truncate text-sm font-medium">
                            {conversation.title || `Chat ${conversation.id.slice(0, 6)}`}
                          </span>
                          {timestamp && (
                            <span className="text-[11px] text-muted-foreground">
                              {timestamp}
                            </span>
                          )}
                          {loadingConversationId === conversation.id && (
                            <span className="text-[11px] text-primary">Loading…</span>
                          )}
                        </div>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        aria-label="Delete conversation"
                        title="Delete conversation"
                        onClick={(event) => onDeleteConversation(conversation.id, event)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
            {userInitial}
          </div>
          <div className="flex flex-1 flex-col text-xs">
            <span className="truncate font-medium">{userName || "Guest"}</span>
            <span className="truncate text-muted-foreground">{userEmail || "Not signed in"}</span>
          </div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </>
  )
}
