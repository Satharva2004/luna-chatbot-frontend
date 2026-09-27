"use client"

import * as React from "react"
import { useAuth } from "@/contexts/auth-context"

export type ConversationSummary = {
  id: string
  title: string
  updated_at: string | null
  created_at: string | null
}

type ConversationSummaryRaw = {
  id: string | number
  title?: unknown
  name?: unknown
  updated_at?: unknown
  updatedAt?: unknown
  created_at?: unknown
  createdAt?: unknown
}

function asIso(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeConversationSummary(
  conversation: ConversationSummaryRaw
): ConversationSummary | null {
  if (!conversation || typeof conversation !== "object" || !conversation.id) {
    return null
  }

  const id = String(conversation.id)
  const rawTitle = conversation.title ?? conversation.name ?? ""
  const title = String(rawTitle).trim() || `Chat ${id.slice(0, 6) || id}`

  return {
    id,
    title,
    updated_at: asIso(
      conversation.updated_at ??
        conversation.updatedAt ??
        conversation.created_at ??
        conversation.createdAt
    ),
    created_at: asIso(
      conversation.created_at ??
        conversation.createdAt ??
        conversation.updated_at ??
        conversation.updatedAt
    ),
  }
}

const sortKey = (c: ConversationSummary) => {
  const t = new Date(c.updated_at ?? c.created_at ?? 0).getTime()
  return Number.isNaN(t) ? 0 : t
}

type ConversationsContextValue = {
  conversations: ConversationSummary[]
  isLoading: boolean
  /** Server-side full-text results, or null when no search is active. */
  searchResults: ConversationSummary[] | null
  isSearching: boolean
  query: string
  setQuery: (value: string) => void
  refresh: () => Promise<void>
  /** Optimistic local mutations, used right after a successful API call. */
  removeLocal: (id: string) => void
  renameLocal: (id: string, title: string) => void
  /** Inserts a thread the chat page just created, with no network round-trip. */
  upsertLocal: (conversation: ConversationSummary) => void
  /** Writes a title to the server and updates the row in place. */
  commitTitle: (id: string, title: string) => Promise<void>
}

const ConversationsContext =
  React.createContext<ConversationsContextValue | undefined>(undefined)

export function ConversationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { token } = useAuth()
  const [conversations, setConversations] = React.useState<ConversationSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [searchResults, setSearchResults] =
    React.useState<ConversationSummary[] | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)

  const refresh = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const resp = await fetch("/api/proxy/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error(await resp.text())

      const data = await resp.json()
      if (Array.isArray(data)) {
        setConversations(
          data
            .map(normalizeConversationSummary)
            .filter((c): c is ConversationSummary => c !== null)
            .sort((a, b) => sortKey(b) - sortKey(a))
        )
      } else {
        setConversations([])
      }
    } catch (error) {
      console.error("Failed to load conversations", error)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  // Debounced server-side message search.
  React.useEffect(() => {
    if (query.trim().length < 3) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const resp = await fetch(
          `/api/proxy/chat/search?q=${encodeURIComponent(query)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
        if (!resp.ok) {
          setSearchResults(null)
          return
        }
        const data = await resp.json()
        setSearchResults(
          Array.isArray(data)
            ? data
                .map(normalizeConversationSummary)
                .filter((c): c is ConversationSummary => c !== null)
            : null
        )
      } catch {
        setSearchResults(null)
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query, token])

  const removeLocal = React.useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setSearchResults((prev) => prev?.filter((c) => c.id !== id) ?? null)
  }, [])

  const upsertLocal = React.useCallback((conversation: ConversationSummary) => {
    setConversations((prev) => {
      const without = prev.filter((c) => c.id !== conversation.id)
      return [conversation, ...without].sort((a, b) => sortKey(b) - sortKey(a))
    })
  }, [])

  const renameLocal = React.useCallback((id: string, title: string) => {
    const apply = (list: ConversationSummary[]) =>
      list.map((c) => (c.id === id ? { ...c, title } : c))
    setConversations(apply)
    setSearchResults((prev) => (prev ? apply(prev) : null))
  }, [])

  const commitTitle = React.useCallback(
    async (id: string, title: string) => {
      const clean = title.trim()
      if (!clean || !token) return
      renameLocal(id, clean)
      try {
        await fetch(`/api/proxy/conversations/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: clean }),
        })
      } catch {
        // The local title still stands; the next refresh reconciles it.
      }
    },
    [renameLocal, token]
  )

  const value = React.useMemo(
    () => ({
      conversations,
      isLoading,
      searchResults,
      isSearching,
      query,
      setQuery,
      refresh,
      removeLocal,
      renameLocal,
      upsertLocal,
      commitTitle,
    }),
    [
      conversations,
      isLoading,
      searchResults,
      isSearching,
      query,
      refresh,
      removeLocal,
      renameLocal,
      upsertLocal,
      commitTitle,
    ]
  )

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  )
}

export function useConversations() {
  const ctx = React.useContext(ConversationsContext)
  if (!ctx) {
    throw new Error("useConversations must be used within a ConversationsProvider")
  }
  return ctx
}

/** Groups conversations into ChatGPT-style buckets by recency. */
export function groupConversations(list: ConversationSummary[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const startOfWeek = startOfToday - 7 * 86_400_000
  const startOfMonth = startOfToday - 30 * 86_400_000

  const buckets: { label: string; items: ConversationSummary[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Previous 30 days", items: [] },
    { label: "Older", items: [] },
  ]

  for (const c of list) {
    const t = sortKey(c)
    if (t >= startOfToday) buckets[0].items.push(c)
    else if (t >= startOfYesterday) buckets[1].items.push(c)
    else if (t >= startOfWeek) buckets[2].items.push(c)
    else if (t >= startOfMonth) buckets[3].items.push(c)
    else buckets[4].items.push(c)
  }

  return buckets.filter((b) => b.items.length > 0)
}
