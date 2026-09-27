"use client"

import React, { useCallback, useDeferredValue, useMemo, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChatForm } from "@/components/ui/chat"
import { type AgentActivityStep, type ImageResult, type Message, type MermaidBlockUpdate } from "@/components/ui/chat-message"
import { CopyButton } from "@/components/ui/copy-button"
import { Input } from "@/components/ui/input"
import { MessageInput } from "@/components/ui/message-input"
import { MessageList } from "@/components/ui/message-list"
import {
  ThumbsUp,
  ThumbsDown,
  Search,
  History,
  Plus,
  Trash2,
  LogOut,
  RotateCcw,
  ChevronDown,
  X,
  Menu,
  BookOpen,
  MessageCircle,
  Compass,
  Sparkles,
  TrendingUp,
  FileText,
  Settings,
  Loader2,
  Download,
  Check,
  Pencil,
  MoreHorizontal,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useConversations } from "@/contexts/conversations-context"
import {
  CONVERSATION_DELETED_EVENT,
  NEW_CHAT_EVENT,
  OPEN_CONVERSATION_EVENT,
} from "@/components/shell/app-sidebar"
import { FeedbackDialog } from "@/components/ui/feedback-dialog"
import { LinkPreviewPane } from "@/components/ui/link-preview-pane"
import { toast } from "sonner"
import { TTSButton } from "@/components/ui/tts-button"
import { LunaIcon } from "@/components/ui/luna-icon"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { OnboardingModal } from "@/components/ui/onboarding-modal"

/**
 * Streaming failures arrive as raw fetch/undici stacks. Surface a short,
 * actionable line instead of dumping the stack into the transcript.
 */
function describeStreamError(raw?: string | null): string {
  const text = String(raw ?? '')
  const lower = text.toLowerCase()

  if (!text || lower.includes('undefined')) {
    return "Something went wrong on my side. Please try that again."
  }
  if (lower.includes('fetch failed') || lower.includes('econnrefused') || lower.includes('enotfound')) {
    return "I can't reach the Luna server right now. Check that the backend is running, then try again."
  }
  if (lower.includes('abort')) {
    return "That response was stopped."
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
    return "All models are rate-limited at the moment. Give it a minute and try again."
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('403')) {
    return "Your session expired. Please sign in again."
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return "That request timed out before I could finish. Try again, or ask for something narrower."
  }

  const firstLine = text.split(/\r?\n/)[0].trim()
  return firstLine.length > 160
    ? "Something went wrong while generating that response. Please try again."
    : `Something went wrong: ${firstLine}`
}

/**
 * Builds a conversation title from the assistant's answer. Prefers the first
 * heading, then the first sentence; falls back to the user's prompt.
 */
function deriveConversationTitle(answer: string, prompt: string): string {
  const clean = (value: string) =>
    value
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`>#~|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const body = String(answer ?? '')
  const heading = body.match(/^\s*#{1,3}\s+(.+)$/m)?.[1]

  let candidate = heading ? clean(heading) : ''

  if (!candidate) {
    const prose = clean(body)
    candidate = prose.split(/(?<=[.!?])\s/)[0] ?? prose
  }

  if (!candidate) candidate = clean(prompt)
  if (!candidate) return 'New chat'

  const words = candidate.split(' ')
  const trimmed = words.length > 8 ? words.slice(0, 8).join(' ') : candidate
  const title = trimmed.length > 60 ? `${trimmed.slice(0, 57).trimEnd()}...` : trimmed

  return title.charAt(0).toUpperCase() + title.slice(1)
}

const DEFAULT_MODEL = 'gemini-2.5-flash'

const MODEL_LABELS: Record<string, string> = {
  'gemini-2.5-flash-lite': 'Fast',
  'gemini-2.5-flash': 'Smart',
  'gemini-2.5-pro': 'Best',
}

const STARTER_PROMPTS = [
  {
    title: 'Explain a concept',
    prompt: 'Explain how transformers work, with a diagram.',
    icon: <BookOpen className="size-3.5" />,
  },
  {
    title: 'Research a topic',
    prompt: 'Summarise the current state of solid-state battery research.',
    icon: <Compass className="size-3.5" />,
  },
  {
    title: 'Compare options',
    prompt: 'Compare PostgreSQL and MongoDB for an analytics workload.',
    icon: <TrendingUp className="size-3.5" />,
  },
  {
    title: 'Draft something',
    prompt: 'Draft a one-page project brief for a student research portal.',
    icon: <FileText className="size-3.5" />,
  },
]

function normalizeImageResults(raw: unknown): ImageResult[] | undefined {
  if (!Array.isArray(raw)) return undefined

  const normalized = raw
    .map((item): ImageResult | null => {
      if (!item || typeof item !== 'object') return null

      const data = item as Record<string, unknown>
      const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : null
      const pageUrl = typeof data.pageUrl === 'string' ? data.pageUrl : null
      const title = typeof data.title === 'string' ? data.title : null
      const thumbnailUrl = typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : null

      if (!imageUrl) return null

      return { title, imageUrl, pageUrl, thumbnailUrl }
    })
    .filter((entry): entry is ImageResult => entry !== null)

  return normalized.length > 0 ? normalized : undefined
}

function applyMermaidReplacements(content: string, blocks: MermaidBlockUpdate[] | undefined) {
  if (typeof content !== 'string' || !Array.isArray(blocks) || blocks.length === 0) {
    return content
  }

  return blocks.reduce((acc, block) => {
    if (typeof block.original === 'string' && typeof block.replacement === 'string') {
      return acc.replace(block.original, block.replacement)
    }
    return acc
  }, content)
}

type ConversationSummary = {
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

type HistoryMessageRaw = {
  id?: unknown
  role?: unknown
  content?: unknown
  created_at?: unknown
  createdAt?: unknown
  sources?: unknown
  charts?: unknown
  excalidraw?: unknown
  excalidraw_data?: unknown
  excalidrawData?: unknown
  images?: unknown
  videos?: unknown
}

type VideoResult = NonNullable<Message["videos"]>[number]

function asIsoStringOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return null
}

function asDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return fallback
}

function normalizeSources(value: unknown): Message["sources"] | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = value
    .map((entry): string | { url: string; title?: string } | null => {
      if (typeof entry === "string") return entry
      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>
        const url = typeof obj.url === "string" ? obj.url : ""
        if (!url) return null
        const title = typeof obj.title === "string" ? obj.title : undefined
        return title ? { url, title } : { url }
      }
      return null
    })
    .filter((x): x is string | { url: string; title?: string } => x !== null)

  return normalized.length > 0 ? normalized : undefined
}

function normalizeVideos(value: unknown): Message["videos"] | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = value
    .map((entry): VideoResult | null => {
      if (!entry || typeof entry !== "object") return null
      const obj = entry as Record<string, unknown>
      const url = typeof obj.url === "string" ? obj.url : undefined
      const videoId = typeof obj.videoId === "string" ? obj.videoId : undefined
      const title = typeof obj.title === "string" ? obj.title : undefined
      const description = typeof obj.description === "string" ? obj.description : undefined
      const channelTitle =
        typeof obj.channelTitle === "string" ? obj.channelTitle : undefined
      const thumbnails = (obj.thumbnails && typeof obj.thumbnails === "object"
        ? (obj.thumbnails as VideoResult["thumbnails"])
        : undefined)

      if (!url && !videoId) return null
      return { url, videoId, title, description, channelTitle, thumbnails }
    })
    .filter((x): x is VideoResult => x !== null)

  return normalized.length > 0 ? normalized : undefined
}

function normalizeExcalidraw(value: unknown): Message["excalidrawData"] | undefined {
  if (!Array.isArray(value)) return undefined
  return value as Message["excalidrawData"]
}

export default function ChatPage() {
  const { logout, token, user, updateUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const {
    conversations,
    isLoading: isHistoryLoading,
    refresh: loadConversations,
    removeLocal: removeConversationLocal,
    renameLocal: renameConversationLocal,
    upsertLocal: upsertConversationLocal,
    commitTitle: commitConversationTitle,
  } = useConversations()
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null)
  const [includeYouTube, setIncludeYouTube] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('luna_yt') === '1'
  })
  const [includeImageSearch, setIncludeImageSearch] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('luna_img') === '1'
  })
  // Default to Smart, not Fast: flash-lite does no reasoning and reads as shallow.
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_MODEL
    const stored = localStorage.getItem('luna_model')
    return stored && stored !== 'gemini-2.5-flash-lite-preview-06-17' ? stored : DEFAULT_MODEL
  })
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [viewportHeight, setViewportHeight] = useState('100dvh')
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsUsername, setSettingsUsername] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [keyHealth, setKeyHealth] = useState<{ total: number; available: number; nextRefreshMs?: number | null; totalRequests?: number } | null>(null)
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string | null>(null)
  const [isLinkPreviewOpen, setIsLinkPreviewOpen] = useState(false)
  const [canDockPreview, setCanDockPreview] = useState(false)
  const [canDockHistory, setCanDockHistory] = useState(false)
  const historySidebarWidth = 340
  const previewPaneWidth = 460

  const displayName = user?.username || user?.name || 'User'
  const displayEmail = user?.email ?? ''
  const userInitial = useMemo(() => {
    const source = user?.email || user?.username || user?.name
    return source ? source.slice(0, 1).toUpperCase() : 'U'
  }, [user])

  const userAvatar = user?.profileImageUrl || user?.avatarUrl || null

  const { salutation, firstName } = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    const base = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    return {
      salutation: base,
      firstName: displayName?.split(' ')[0] ?? 'there',
    }
  }, [displayName])

  const desktopActionClasses =
    "group/nav relative inline-flex h-8 items-center overflow-hidden rounded-full border border-border/60 bg-secondary/80 px-4 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/50 shadow-none"
  const desktopProfileButtonClasses =
    "group/profile relative flex h-8 min-w-0 items-center gap-2 overflow-hidden rounded-full border border-border/60 bg-secondary/80 px-2 pr-3.5 text-left text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/50 shadow-none"

  // Layout heights state
  const [layoutHeights, setLayoutHeights] = useState({
    header: 64,
    footer: 88,
  })

  // Measure header and footer heights
  useEffect(() => {
    const updateHeights = () => {
      setLayoutHeights({
        header: headerRef.current?.offsetHeight ?? 64,
        footer: footerRef.current?.offsetHeight ?? 88,
      })
    }

    updateHeights()
    window.addEventListener('resize', updateHeights)
    return () => window.removeEventListener('resize', updateHeights)
  }, [])

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === 'undefined') return

      const viewport = window.visualViewport
      const height = viewport?.height ?? window.innerHeight
      setViewportHeight(`${height}px`)
      setCanDockHistory(window.innerWidth >= 768)
      setCanDockPreview(window.innerWidth >= 1280)
    }

    updateViewport()

    const viewport = typeof window !== 'undefined' ? window.visualViewport : null
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)
    window.addEventListener('orientationchange', updateViewport)
    window.addEventListener('resize', updateViewport)

    return () => {
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/proxy/status')
        .then(r => r.json())
        .then(data => {
          if (typeof data.total === 'number') {
            setKeyHealth({ total: data.total, available: data.available, nextRefreshMs: data.nextRefreshMs ?? null, totalRequests: data.totalRequests ?? 0 })
            setRefreshCountdown(data.nextRefreshMs ? Math.ceil(data.nextRefreshMs / 1000) : null)
          }
        })
        .catch(() => {})
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (refreshCountdown === null || refreshCountdown <= 0) return
    const timer = setTimeout(() => {
      setRefreshCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [refreshCountdown])

  // Show onboarding for first-time users
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('luna_onboarded')) {
      setShowOnboarding(true)
    }
  }, [])

  const formatConversationDate = useCallback((iso?: string | null) => {
    if (!iso) return ""
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ""
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date)
  }, [])





  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (isProfileOpen && !target?.closest('.profile-dropdown')) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProfileOpen])

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
  }, [])

  const startNewChat = useCallback(() => {
    stop()
    setMessages([])
    setCurrentConversationId(null)
    setInput("")
    setShowSuggestions(false)
    setLoadingConversationId(null)
    setIsProfileOpen(false)
  }, [stop])

  const normalizeMessageFromHistory = useCallback((message: HistoryMessageRaw): Message => {
    // DEBUG: Check what excalidraw data is coming from backend
    if (message?.excalidraw || message?.excalidraw_data) {
      console.log('🔄 Data from DB:', { id: message.id, excalidraw: message.excalidraw, old_data: message.excalidraw_data })
    }

    const role = message?.role === 'model' ? 'assistant' : message?.role ?? 'assistant'
    const createdAtIso = message?.created_at ?? message?.createdAt
    const normalizedVideos = normalizeVideos(message?.videos)
    return {
      id: message?.id ? String(message.id) : crypto.randomUUID(),
      role: role === 'assistant' || role === 'user' || role === 'system' ? role : 'assistant',
      content: asString(message?.content, ''),
      createdAt: asDate(createdAtIso),
      sources: normalizeSources(message?.sources),
      chartUrl: typeof message?.charts === 'string' ? message.charts : Array.isArray(message?.charts) ? message.charts[0] : undefined,
      chartUrls: Array.isArray(message?.charts)
        ? message.charts.filter((url: unknown): url is string => typeof url === 'string' && url.trim().length > 0)
        : (typeof message?.charts === 'string' && message.charts.trim().length > 0)
          ? [message.charts]
          : undefined,
      excalidrawData: normalizeExcalidraw(
        message.excalidraw ?? message.excalidraw_data ?? message.excalidrawData
      ),
      images: normalizeImageResults(message?.images),
      videos: normalizedVideos,
    }
  }, [])

  const attachPromptTitlesToHistory = useCallback((historyMessages: Message[]): Message[] => {
    let lastUserContent: string | undefined

    return historyMessages.map((msg) => {
      if (msg.role === "user") {
        lastUserContent = msg.content || ""
        return msg
      }

      if (msg.role === "assistant" && !msg.promptTitle && lastUserContent && lastUserContent.trim().length > 0) {
        return {
          ...msg,
          promptTitle: lastUserContent,
        }
      }

      return msg
    })
  }, [])

  const handleConversationSelect = useCallback(async (conversationId: string) => {
    stop()
    setLoadingConversationId(conversationId)
    setIsProfileOpen(false)
    try {
      const resp = await fetch(`/api/proxy/conversations/${conversationId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })

      if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(errorText || 'Failed to load conversation')
      }

      const data = await resp.json()
      const historyMessages = Array.isArray(data?.messages)
        ? [...data.messages]
          .sort((a, b) => {
            const aTime = new Date(a?.created_at ?? a?.createdAt ?? 0).getTime()
            const bTime = new Date(b?.created_at ?? b?.createdAt ?? 0).getTime()
            if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
            if (Number.isNaN(aTime)) return -1
            if (Number.isNaN(bTime)) return 1
            return aTime - bTime
          })
          .map(normalizeMessageFromHistory)
        : []

      const historyWithTitles = attachPromptTitlesToHistory(historyMessages)

      setMessages(historyWithTitles)
      setCurrentConversationId(data?.id ? String(data.id) : conversationId)
      setInput("")
      setShowSuggestions(false)
      setIsGenerating(false)
    } catch (error) {
      console.error('Failed to load conversation history', error)
    } finally {
      setLoadingConversationId(null)
    }
  }, [attachPromptTitlesToHistory, normalizeMessageFromHistory, stop, token])

  // Deep links from the dashboard shell: /chat?c=<id> opens a thread, /chat?new=1 starts fresh.
  const deepLinkHandledRef = useRef(false)
  useEffect(() => {
    if (deepLinkHandledRef.current) return
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const conversationId = params.get('c')
    const wantsNew = params.get('new')

    if (!conversationId && !wantsNew) return
    if (conversationId && !token) return

    deepLinkHandledRef.current = true

    if (conversationId) {
      void handleConversationSelect(conversationId)
    } else {
      startNewChat()
    }

    window.history.replaceState(null, '', window.location.pathname)
  }, [handleConversationSelect, startNewChat, token])

  // Sidebar actions taken while already on /chat. A router push would not
  // remount this page, so these arrive as events instead.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id) void handleConversationSelect(id)
    }
    const onNew = () => startNewChat()

    window.addEventListener(OPEN_CONVERSATION_EVENT, onOpen)
    window.addEventListener(NEW_CHAT_EVENT, onNew)
    return () => {
      window.removeEventListener(OPEN_CONVERSATION_EVENT, onOpen)
      window.removeEventListener(NEW_CHAT_EVENT, onNew)
    }
  }, [handleConversationSelect, startNewChat])

  // Keep the sidebar's active-row highlight in sync with the open thread.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('luna:conversation-opened', { detail: currentConversationId })
    )
  }, [currentConversationId])

  // If the sidebar deletes the thread we're showing, reset to a blank chat.
  useEffect(() => {
    const onDeleted = (e: Event) => {
      const deletedId = (e as CustomEvent<string>).detail
      if (deletedId && deletedId === currentConversationId) {
        startNewChat()
      }
    }
    window.addEventListener(CONVERSATION_DELETED_EVENT, onDeleted)
    return () => window.removeEventListener(CONVERSATION_DELETED_EVENT, onDeleted)
  }, [currentConversationId, startNewChat])

  const handleDeleteConversation = useCallback(async (conversationId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    event?.stopPropagation()
    try {
      const resp = await fetch(`/api/proxy/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })

      if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(errorText || 'Failed to delete conversation')
      }

      removeConversationLocal(conversationId)

      if (currentConversationId === conversationId) {
        startNewChat()
      }
    } catch (error) {
      console.error('Failed to delete conversation', error)
    }
  }, [currentConversationId, removeConversationLocal, startNewChat, token])

  const handleRenameConversation = useCallback(async (conversationId: string, newTitle: string) => {
    if (!newTitle.trim()) return
    try {
      const resp = await fetch(`/api/proxy/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      if (resp.ok) {
        renameConversationLocal(conversationId, newTitle.trim())
      }
    } catch {
      toast.error('Failed to rename conversation')
    } finally {
      setEditingConversationId(null)
    }
  }, [renameConversationLocal, token])

  const exportConversation = useCallback(() => {
    if (messages.length === 0) return
    const title = conversations.find(c => c.id === currentConversationId)?.title || 'conversation'
    const lines: string[] = [`# ${title}`, '']
    for (const msg of messages) {
      if (msg.role === 'user') {
        lines.push(`**You:** ${msg.content}`, '')
      } else if (msg.role === 'assistant') {
        lines.push(`**Luna:** ${msg.content}`, '')
        if (msg.sources && msg.sources.length > 0) {
          lines.push('**Sources:**')
          msg.sources.forEach((s: { url?: string; title?: string }) => {
            lines.push(`- [${s.title || s.url}](${s.url})`)
          })
          lines.push('')
        }
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [messages, conversations, currentConversationId])

  const deferredInput = useDeferredValue(input)



  const handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setInput(e.target.value)
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setInput(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const simulateAssistant = async (assistantMessageId: string, userContent: string, attachments?: FileList) => {
    try {
      console.log('Starting streaming request with prompt:', userContent)

      const conversationId = currentConversationId
      // Only the opening answer names the thread. Re-titling on every reply
      // made the sidebar entry change under the user mid-conversation.
      const isFirstAnswerInThread = !conversationId
      abortControllerRef.current = new AbortController()

      let response: Response
      if (attachments && attachments.length > 0) {
        const formData = new FormData()
        formData.append('prompt', userContent)
        if (conversationId) formData.append('conversationId', conversationId)
        formData.append('options', JSON.stringify({ includeYouTube, includeImageSearch, model: selectedModel }))
        Array.from(attachments).forEach((file) => {
          formData.append('files', file, file.name)
        })

        response = await fetch(`/api/proxy/chat/stream`, {
          method: 'POST',
          body: formData,
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          signal: abortControllerRef.current.signal,
        })
      } else {
        response = await fetch(`/api/proxy/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            prompt: userContent,
            conversationId: conversationId || undefined,
            options: {
              includeYouTube,
              includeImageSearch,
              model: selectedModel,
            },
          }),
          signal: abortControllerRef.current.signal,
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(errorText || 'Failed to get response from the API')
      }

      let resolvedConversationId: string | null = conversationId || null

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamedContent = ''
      let streamedSources: string[] = []
      let streamedImages: ImageResult[] = []
      let streamedVideos: NonNullable<Message["videos"]> = []
      let streamedCodeSnippets: Message["codeSnippets"] = []
      let streamedExecutionOutputs: Message["executionOutputs"] = []
      let streamedMermaidBlocks: MermaidBlockUpdate[] | undefined
      let currentEvent = ''
      let updateTimer: NodeJS.Timeout | null = null
      let pendingUpdate = false

      const upsertAgentStep = (step: AgentActivityStep) => {
        const normalizedStep: AgentActivityStep = {
          ...step,
          updatedAt: step.updatedAt ?? Date.now(),
        }

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantMessageId) return msg

            const existingSteps = Array.isArray(msg.agentSteps) ? msg.agentSteps : []
            const existingIndex = existingSteps.findIndex((item) => item.id === normalizedStep.id)
            const nextSteps =
              existingIndex >= 0
                ? existingSteps.map((item, index) => index === existingIndex ? { ...item, ...normalizedStep } : item)
                : [...existingSteps, normalizedStep]

            return { ...msg, agentSteps: nextSteps }
          })
        )
      }

      const processSseLine = (line: string) => {
        if (!line.trim()) {
          currentEvent = ''
          return
        }

        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
          return
        }

        if (!line.startsWith('data: ')) {
          return
        }

        const data = line.slice(6).trim()

        if (!data) return

        try {
          const parsed = JSON.parse(data)

          // Handle different event types
          if (currentEvent === 'conversationId' || parsed.conversationId) {
            console.log('Setting conversation ID:', parsed.conversationId)
            resolvedConversationId = parsed.conversationId
            if (parsed.conversationId !== currentConversationId) {
              setCurrentConversationId(parsed.conversationId)
              // Insert the row optimistically; titled properly once the answer lands.
              const nowIso = new Date().toISOString()
              upsertConversationLocal({
                id: String(parsed.conversationId),
                title: deriveConversationTitle('', userContent),
                created_at: nowIso,
                updated_at: nowIso,
              })
            }
          }
          else if (currentEvent === 'message' && parsed.text && typeof parsed.text === 'string') {
            streamedContent += parsed.text

            // Batch updates for smoother streaming - update every 50ms max
            if (!pendingUpdate) {
              pendingUpdate = true
              if (updateTimer) clearTimeout(updateTimer)

              updateTimer = setTimeout(() => {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: streamedContent, createdAt: new Date(), isComplete: false }
                      : msg
                  )
                )
                pendingUpdate = false
              }, 50)
            }
          }
          else if (currentEvent === 'status' && parsed.id && parsed.label) {
            upsertAgentStep({
              id: String(parsed.id),
              label: String(parsed.label),
              state: parsed.state === 'queued' || parsed.state === 'complete' || parsed.state === 'error'
                ? parsed.state
                : 'running',
              detail: typeof parsed.detail === 'string' ? parsed.detail : undefined,
            })
          }
          else if (currentEvent === 'images' && parsed.images && Array.isArray(parsed.images)) {
            const normalized = normalizeImageResults(parsed.images)
            if (normalized) {
              streamedImages = normalized
              console.log('🖼️ Received images:', normalized.length)
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, images: normalized }
                    : msg
                )
              )
            }
          }
          else if (currentEvent === 'sources' && parsed.sources && Array.isArray(parsed.sources)) {
            streamedSources = parsed.sources
            console.log('📚 Received sources:', streamedSources.length)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, sources: streamedSources }
                  : msg
              )
            )
          }
          else if (currentEvent === 'code' && parsed.code) {
            const snippet = {
              language: typeof parsed.language === 'string' ? parsed.language : undefined,
              code: String(parsed.code)
            }
            streamedCodeSnippets = [...(streamedCodeSnippets ?? []), snippet]
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, codeSnippets: streamedCodeSnippets }
                  : msg
              )
            )
          }
          else if (currentEvent === 'codeResult' && parsed.output) {
            const executionResult = {
              outcome: typeof parsed.outcome === 'string' ? parsed.outcome : undefined,
              output: String(parsed.output)
            }
            streamedExecutionOutputs = [...(streamedExecutionOutputs ?? []), executionResult]
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, executionOutputs: streamedExecutionOutputs }
                  : msg
              )
            )
          }
          else if (currentEvent === 'mermaid' && Array.isArray(parsed.blocks)) {
            streamedMermaidBlocks = parsed.blocks as MermaidBlockUpdate[]
            const updatedContent = applyMermaidReplacements(streamedContent, streamedMermaidBlocks)
            if (updatedContent !== streamedContent) {
              streamedContent = updatedContent
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                    ...msg,
                    content: streamedContent,
                    mermaidBlocks: streamedMermaidBlocks,
                    isComplete: false,
                  }
                  : msg
              )
            )
          }
          else if (currentEvent === 'youtubeResults' && parsed.videos && Array.isArray(parsed.videos)) {
            streamedVideos = (normalizeVideos(parsed.videos) ?? []) as NonNullable<Message["videos"]>
            console.log('🎥 Received YouTube videos:', streamedVideos.length)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, videos: streamedVideos }
                  : msg
              )
            )
          }
          else if (currentEvent === 'excalidraw' && parsed.excalidrawData && Array.isArray(parsed.excalidrawData)) {
            console.log('🎨 Received Excalidraw data:', parsed.excalidrawData.length)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, excalidrawData: parsed.excalidrawData }
                  : msg
              )
            )
          }
          else if (currentEvent === 'finish' && parsed.finishReason) {
            console.log('✅ Stream finished with reason:', parsed.finishReason)
          }
          else if (currentEvent === 'error' && parsed.error) {
            console.error('❌ Stream error:', parsed.error)
            throw new Error(parsed.error)
          }

        } catch (parseError) {
          if (data !== '[DONE]') {
            console.warn('Failed to parse SSE data:', data, parseError)
          }
        }
      }

      if (!reader) {
        throw new Error('No response body reader available')
      }

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          console.log('Stream complete')
          // Process any remaining buffered data when the stream ends
          if (buffer.trim().length > 0) {
            const remainingLines = buffer.split('\n')
            for (const line of remainingLines) {
              if (line) {
                processSseLine(line)
              }
            }
            buffer = ''
          }

          // Flush any pending updates
          if (updateTimer) {
            clearTimeout(updateTimer)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: streamedContent, createdAt: new Date() }
                  : msg
              )
            )
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          processSseLine(line)
        }
      }

      const finalContent = (streamedContent || "I couldn't fetch the details. Please try again later.")

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
              ...msg,
              content: finalContent,
              sources: streamedSources,
              chartUrl: msg.chartUrl,
              chartUrls: msg.chartUrls ?? [],
              images: streamedImages.length > 0 ? streamedImages : msg.images,
              videos: streamedVideos.length > 0 ? streamedVideos : msg.videos,
              codeSnippets: streamedCodeSnippets,
              executionOutputs: streamedExecutionOutputs,
              mermaidBlocks: streamedMermaidBlocks,
              createdAt: new Date(),
              isComplete: true,
            }
            : msg
        )
      )

      const titledConversationId = resolvedConversationId ?? currentConversationId
      if (isFirstAnswerInThread && titledConversationId && finalContent.trim()) {
        void commitConversationTitle(
          String(titledConversationId),
          deriveConversationTitle(finalContent, userContent)
        )
      }

      const chartsConversationId = resolvedConversationId ?? currentConversationId

      if (!abortControllerRef.current?.signal.aborted && chartsConversationId) {
        try {
          upsertAgentStep({
            id: 'chart-generation',
            label: 'Checking for charts',
            state: 'running',
          })

          const chartsResponse = await fetch('/api/proxy/charts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              prompt: userContent,
              conversationId: chartsConversationId,
              messageId: assistantMessageId,
              options: { includeSearch: true, includeYouTube },
            }),
          })

          if (chartsResponse.ok) {
            const chartData = await chartsResponse.json()
            const chartUrlFromResponse = chartData?.chartUrl || chartData?.charts?.chartUrl

            if (typeof chartUrlFromResponse === 'string' && chartUrlFromResponse.trim().length > 0) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                      ...msg,
                      chartUrl: chartUrlFromResponse,
                      chartUrls: Array.from(new Set([...(msg.chartUrls ?? []), chartUrlFromResponse])),
                    }
                    : msg
                )
              )
              upsertAgentStep({
                id: 'chart-generation',
                label: 'Chart ready',
                state: 'complete',
              })
            } else {
              upsertAgentStep({
                id: 'chart-generation',
                label: 'No chart needed',
                state: 'complete',
              })
            }
          } else {
            throw new Error(await chartsResponse.text())
          }
        } catch (chartErr) {
          console.error('Chart fetch after chat failed:', chartErr)
          upsertAgentStep({
            id: 'chart-generation',
            label: 'Chart check failed',
            state: 'error',
            detail: chartErr instanceof Error ? chartErr.message : 'Unable to build chart',
          })
        }
      }

    } catch (error: unknown) {
      const abortName = (typeof error === "object" && error !== null && "name" in error)
        ? String((error as { name?: unknown }).name)
        : ""
      if (abortName === 'AbortError') {
        console.log('Stream was aborted by user')
        return
      }

      console.error('Error in streaming:', error)
      const errMsg = error instanceof Error ? error.message : String(error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
              ...msg,
              content: describeStreamError(errMsg),
              createdAt: new Date(),
              isComplete: true,
            }
            : msg
        )
      )
    }
  }

  const handleSubmit = (
    event?: { preventDefault?: () => void },
    options?: { experimental_attachments?: FileList }
  ) => {
    event?.preventDefault?.()
    if (!input && !options?.experimental_attachments?.length) return

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input || "(sent with attachments)",
      createdAt: new Date(),
      experimental_attachments: options?.experimental_attachments
        ? Array.from(options.experimental_attachments).map((f) => ({
          name: f.name,
          contentType: f.type,
          url: "data:;base64,",
        }))
        : undefined,
    }

    const assistantMessageId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
      sources: [],
      chartUrl: null,
      chartUrls: [],
      images: [],
      promptTitle: newMessage.content,
      isComplete: false,
      agentSteps: [
        {
          id: "request-context",
          label: "Preparing context",
          state: "running",
          updatedAt: Date.now(),
        },
      ],
    }

    setMessages((prev) => [...prev, newMessage, assistantMessage])
    setInput("")
    setIsGenerating(true)

    setSuggestions([])
    simulateAssistant(assistantMessageId, newMessage.content, options?.experimental_attachments)
      .then(() => {
        // Fetch follow-up suggestions after stream completes
        setMessages((prev) => {
          const lastAssistant = [...prev].reverse().find(m => m.role === 'assistant')
          if (lastAssistant?.content) {
            fetch('/api/proxy/suggestions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lastMessage: lastAssistant.content.slice(0, 1200) }),
            })
              .then(r => r.json())
              .then(d => { if (Array.isArray(d.suggestions)) setSuggestions(d.suggestions) })
              .catch(() => {})
          }
          return prev
        })
      })
      .finally(() => {
        setIsGenerating(false)
        abortControllerRef.current = null
      })
  }

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    if (!newContent.trim() || isGenerating) return

    const assistantMessageId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      sources: [],
      chartUrl: null,
      chartUrls: [],
      images: [],
      promptTitle: newContent,
      isComplete: false,
      agentSteps: [{ id: 'request-context', label: 'Preparing context', state: 'running', updatedAt: Date.now() }],
    }

    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === messageId)
      if (idx === -1) return prev
      const trimmed = prev.slice(0, idx + 1).map(m =>
        m.id === messageId ? { ...m, content: newContent } : m
      )
      return [...trimmed, assistantMessage]
    })

    setIsGenerating(true)
    simulateAssistant(assistantMessageId, newContent)
      .finally(() => {
        setIsGenerating(false)
        abortControllerRef.current = null
      })
  }, [isGenerating, simulateAssistant])

  const handleRegenerateChart = useCallback(async (assistantMessageId: string, previousUrl: string) => {
    const assistantIndex = messages.findIndex((m) => m.id === assistantMessageId)
    if (assistantIndex === -1) return null

    const userMessage = messages.slice(0, assistantIndex).reverse().find((m) => m.role === 'user')
    if (!userMessage?.content?.trim()) {
      toast.error('Could not find the original prompt for this chart')
      return null
    }

    const chartsConversationId = currentConversationId
    if (!chartsConversationId) return null

    try {
      const response = await fetch('/api/proxy/charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          conversationId: chartsConversationId,
          messageId: assistantMessageId,
          options: { includeSearch: true, includeYouTube },
        }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const chartData = await response.json()
      const newUrl = chartData?.chartUrl || chartData?.charts?.chartUrl

      if (typeof newUrl !== 'string' || !newUrl.trim()) {
        toast.error('Could not regenerate a chart for this message')
        return null
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== assistantMessageId) return msg
          const nextChartUrls = (msg.chartUrls ?? []).map((url) => (url === previousUrl ? newUrl : url))
          return {
            ...msg,
            chartUrl: msg.chartUrl === previousUrl ? newUrl : msg.chartUrl,
            chartUrls: nextChartUrls,
          }
        })
      )

      return newUrl
    } catch (error) {
      console.error('Chart regeneration failed:', error)
      toast.error('Failed to regenerate chart')
      return null
    }
  }, [messages, currentConversationId, includeYouTube, token])

  const handleRegenerateFlowchart = useCallback(async (assistantMessageId: string, diagramIndex: number) => {
    const assistantMessage = messages.find((m) => m.id === assistantMessageId)
    const assistantIndex = messages.findIndex((m) => m.id === assistantMessageId)
    if (!assistantMessage || assistantIndex === -1) return

    const userMessage = messages.slice(0, assistantIndex).reverse().find((m) => m.role === 'user')
    if (!userMessage?.content?.trim()) {
      toast.error('Could not find the original prompt for this flowchart')
      return
    }

    try {
      const generateResponse = await fetch('/api/proxy/excalidraw/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: userMessage.content }),
      })

      if (!generateResponse.ok) {
        throw new Error(await generateResponse.text())
      }

      const generated = await generateResponse.json()
      const newDiagram = generated?.data
      if (!newDiagram || !Array.isArray(newDiagram.elements)) {
        toast.error('Could not regenerate this flowchart')
        return
      }

      const nextExcalidrawData = (assistantMessage.excalidrawData ?? []).map((diagram, i) =>
        i === diagramIndex ? newDiagram : diagram
      )

      const patchResponse = await fetch(`/api/proxy/messages/${assistantMessageId}/excalidraw`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ excalidrawData: nextExcalidrawData }),
      })

      if (!patchResponse.ok) {
        throw new Error(await patchResponse.text())
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, excalidrawData: nextExcalidrawData } : msg
        )
      )
    } catch (error) {
      console.error('Flowchart regeneration failed:', error)
      toast.error('Failed to regenerate flowchart')
    }
  }, [messages, token])

  const handleSaveSettings = useCallback(async () => {
    if (!settingsUsername.trim()) return
    setIsSavingSettings(true)
    try {
      const resp = await fetch('/api/proxy/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: settingsUsername.trim() }),
      })
      const data = await resp.json()
      if (resp.ok && data.user) {
        updateUser({ username: data.user.username })
        toast.success('Profile updated')
        setIsSettingsOpen(false)
      } else {
        toast.error(data.error || 'Failed to update profile')
      }
    } catch {
      toast.error('Error updating profile')
    } finally {
      setIsSavingSettings(false)
    }
  }, [settingsUsername, token, updateUser])

  const onRateResponse = useCallback((messageId: string, rating: "thumbs-up" | "thumbs-down") => {
    console.log("Rated", messageId, rating)

    toast.success(
      rating === "thumbs-up" ? "Marked response as helpful" : "Marked response as not helpful",
      {
        description: "Thanks for your feedback!",
      }
    )
  }, [])

  const handleOpenExternalPreview = useCallback((url: string, title?: string) => {
    setPreviewUrl(url)
    setPreviewTitle(title ?? null)
    setIsLinkPreviewOpen(true)
  }, [])

  const messageOptions = useCallback((message: Message) => {
    if (message.role === "user") {
      return {
        onEdit: (newContent: string) => handleEditMessage(message.id, newContent),
      }
    }

    return {
      actions: (
        <>
          <div className="flex items-center gap-1 border-r pr-1">
            <TTSButton content={message.content} />
            <CopyButton
              content={message.content}
              copyMessage="Copied response to clipboard!"
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onRateResponse(message.id, "thumbs-up")}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onRateResponse(message.id, "thumbs-down")}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </>
      ),
      isComplete: message.isComplete,
      onOpenExternalPreview: handleOpenExternalPreview,
      onRegenerateChart: (previousUrl: string) => handleRegenerateChart(message.id, previousUrl),
      onRegenerateFlowchart: (diagramIndex: number) => handleRegenerateFlowchart(message.id, diagramIndex),
      authToken: token ?? undefined,
    }
  }, [handleEditMessage, handleOpenExternalPreview, handleRegenerateChart, handleRegenerateFlowchart, onRateResponse, token])

  const handleStarterClick = useCallback((promptText: string) => {
    setInput(promptText)
    inputRef.current?.focus()
  }, [])

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.wav')

      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to transcribe audio')
      }

      const data = await response.json()
      if (data.success && data.text) {
        return data.text
      } else {
        throw new Error('No transcription returned')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      throw error
    }
  }

  const activeConversation =
    conversations.find((c) => c.id === currentConversationId) ?? null
  const modelLabel = MODEL_LABELS[selectedModel] ?? 'Model'
  const isEmpty = messages.length === 0

  const composer = (
    <ChatForm isPending={isGenerating} handleSubmit={handleSubmit}>
      {({ files, setFiles }) => (
        <div className="relative">
          <MessageInput
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSuggestions(false)
            }}
            stop={stop}
            isGenerating={isGenerating}
            transcribeAudio={transcribeAudio}
            inputRef={inputRef}
            allowAttachments
            files={files}
            setFiles={setFiles}
            includeYouTube={includeYouTube}
            onToggleYouTube={(next: boolean) => {
              setIncludeYouTube(next)
              localStorage.setItem('luna_yt', next ? '1' : '0')
            }}
            includeImageSearch={includeImageSearch}
            onToggleImageSearch={(next: boolean) => {
              setIncludeImageSearch(next)
              localStorage.setItem('luna_img', next ? '1' : '0')
            }}
            selectedModel={selectedModel}
            onModelChange={(model) => {
              setSelectedModel(model)
              localStorage.setItem('luna_model', model)
            }}
          />
        </div>
      )}
    </ChatForm>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread toolbar */}
      <div className="flex h-10 shrink-0 items-center gap-2 px-4">
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
          {activeConversation?.title ?? 'New chat'}
        </p>

        {keyHealth && keyHealth.total > 0 && (
          <span
            title={
              keyHealth.available === 0
                ? 'All models cooling down'
                : `${keyHealth.available} of ${keyHealth.total} models available`
            }
            className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex"
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                keyHealth.available === 0
                  ? 'animate-pulse bg-red-500'
                  : keyHealth.available < keyHealth.total
                    ? 'bg-yellow-400'
                    : 'bg-emerald-500'
              )}
            />
            {keyHealth.available === 0
              ? refreshCountdown
                ? `Cooling down ${refreshCountdown}s`
                : 'Cooling down'
              : `${keyHealth.available}/${keyHealth.total} models`}
          </span>
        )}

        <Badge variant="secondary" className="h-5 text-[10px]">
          {modelLabel}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Chat options">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={startNewChat}>
              <Plus />
              New chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportConversation} disabled={isEmpty}>
              <Download />
              Export transcript
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSettingsUsername(displayName === 'User' ? '' : displayName)
                setIsSettingsOpen(true)
              }}
            >
              <Settings />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsFeedbackOpen(true)}>
              <MessageCircle />
              Send feedback
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Thread */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {isEmpty ? (
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center px-4 pb-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <h2 className="mt-5 text-center font-heading text-2xl font-semibold tracking-tight">
              {salutation}, {firstName}
            </h2>
            <p className="mt-1.5 text-center text-sm text-muted-foreground">
              What would you like to look into?
            </p>

            <div className="mt-8 w-full">{composer}</div>

            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((starter) => (
                <button
                  key={starter.prompt}
                  type="button"
                  onClick={() => handleStarterClick(starter.prompt)}
                  className="flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {starter.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{starter.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                      {starter.prompt}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full min-w-0 max-w-3xl px-4 pb-4">
            <MessageList messages={messages} messageOptions={messageOptions} />

            {suggestions.length > 0 && !isGenerating && (
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInput(s)
                      setSuggestions([])
                      setTimeout(() => inputRef.current?.focus(), 50)
                    }}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer, pinned once a thread is underway */}
      {!isEmpty && (
        <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-3 pt-2">
          <div className="mx-auto w-full max-w-3xl">
            {composer}
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Luna can make mistakes. Verify anything important.
            </p>
          </div>
        </div>
      )}

      {/* Profile */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>Update how you appear in Luna.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={userAvatar ?? ''} alt={displayName} />
                <AvatarFallback>{userInitial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={settingsUsername}
                onChange={(e) => setSettingsUsername(e.target.value)}
                placeholder="Your name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveSettings()
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="display-email">Email</Label>
              <Input id="display-email" value={displayEmail} disabled />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveSettings()} disabled={isSavingSettings}>
              {isSavingSettings ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OnboardingModal
        open={showOnboarding}
        onClose={() => {
          setShowOnboarding(false)
          localStorage.setItem('luna_onboarded', '1')
        }}
      />
      <FeedbackDialog
        open={isFeedbackOpen}
        onOpenChange={setIsFeedbackOpen}
        conversationId={currentConversationId}
        userEmail={displayEmail}
        userId={user ? user.email : null}
      />
      <LinkPreviewPane
        open={isLinkPreviewOpen}
        url={previewUrl}
        title={previewTitle}
        topOffset={0}
        width={previewPaneWidth}
        onClose={() => setIsLinkPreviewOpen(false)}
      />
    </div>
  )
}
