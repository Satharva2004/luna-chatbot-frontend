"use client"

import React, { useCallback, useMemo, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChatForm } from "@/components/ui/chat"
import { type ImageResult, type Message, type MermaidBlockUpdate } from "@/components/ui/chat-message"
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
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { SuggestionDropdown } from "@/components/ui/suggestion-dropdown"
import { fuzzySearch } from "@/services/suggestions/fuzzy"
import { Playfair_Display } from "next/font/google"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { FeedbackDialog } from "@/components/ui/feedback-dialog"
import { LinkPreviewPane } from "@/components/ui/link-preview-pane"
import { toast } from "sonner"
import { TTSButton } from "@/components/ui/tts-button"
import { LunaIcon } from "@/components/ui/luna-icon"

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

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
})

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
  const { logout, token, user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null)
  const [includeYouTube, setIncludeYouTube] = useState(false)
  const [includeImageSearch, setIncludeImageSearch] = useState(false)
  const [viewportHeight, setViewportHeight] = useState('100dvh')
  const [historyQuery, setHistoryQuery] = useState("")
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
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
    "group/nav relative inline-flex h-9 items-center overflow-hidden rounded-full border border-border/50 bg-background/70 px-5 text-sm font-medium text-foreground/80 shadow-sm backdrop-blur-xl transition-colors hover:bg-background/85 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
  const desktopProfileButtonClasses =
    "group/profile relative flex min-h-10 min-w-0 items-center gap-3 overflow-hidden rounded-full border border-border/50 bg-background/70 px-2 pr-5 text-left text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-background/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"

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

  const normalizeConversationSummary = useCallback((conversation: ConversationSummaryRaw): ConversationSummary | null => {
    if (!conversation || typeof conversation !== "object" || !conversation.id) return null

    const id = String(conversation.id)
    const rawTitle = conversation.title ?? conversation.name ?? ""
    const title = String(rawTitle).trim() || `Chat ${id.slice(0, 6) || id}`
    const updatedAt = asIsoStringOrNull(
      conversation.updated_at ?? conversation.updatedAt ?? conversation.created_at ?? conversation.createdAt
    )
    const createdAt = asIsoStringOrNull(
      conversation.created_at ?? conversation.createdAt ?? conversation.updated_at ?? conversation.updatedAt
    )

    return {
      id,
      title,
      updated_at: updatedAt,
      created_at: createdAt,
    }
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      setIsHistoryLoading(true)
      const resp = await fetch('/api/proxy/conversations', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        }
      })

      if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(errorText || 'Failed to fetch conversations')
      }

      const data = await resp.json()
      if (Array.isArray(data)) {
        const normalized = data
          .map(normalizeConversationSummary)
          .filter((conversation): conversation is ConversationSummary => conversation !== null)

        const getTime = (conversation: ConversationSummary) => {
          const timestamp = conversation.updated_at ?? conversation.created_at ?? ""
          const time = new Date(timestamp).getTime()
          return Number.isNaN(time) ? 0 : time
        }

        normalized.sort((a, b) => getTime(b) - getTime(a))
        setConversations(normalized)
      } else {
        setConversations([])
      }
    } catch (error) {
      console.error('Failed to load conversations', error)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [normalizeConversationSummary, token])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!currentConversationId) return
    loadConversations()
  }, [currentConversationId, loadConversations])

  useEffect(() => {
    if (!canDockHistory && isHistoryOpen) {
      setIsHistoryOpen(false)
    }
  }, [canDockHistory, isHistoryOpen])

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
    setIsMobileMenuOpen(false)
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
    setIsMobileMenuOpen(false)
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

      setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId))

      if (currentConversationId === conversationId) {
        startNewChat()
      }
    } catch (error) {
      console.error('Failed to delete conversation', error)
    }
  }, [currentConversationId, startNewChat, token])

  const filteredSuggestions = useMemo(() => {
    if (!input || input.trim().length < 2) return []
    return fuzzySearch(input).slice(0, 5)
  }, [input])

  const filteredHistory = useMemo(() => {
    if (!historyQuery.trim()) {
      return conversations
    }

    const query = historyQuery.toLowerCase()

    return conversations.filter((conversation) => {
      const title = conversation.title || `Chat ${conversation.id.slice(0, 6)}`
      return (
        title.toLowerCase().includes(query) ||
        conversation.id.toLowerCase().includes(query)
      )
    })
  }, [historyQuery, conversations])

  const handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setInput(e.target.value)
    setShowSuggestions(e.target.value.length > 0)
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
      abortControllerRef.current = new AbortController()

      let response: Response
      if (attachments && attachments.length > 0) {
        const formData = new FormData()
        formData.append('prompt', userContent)
        if (conversationId) formData.append('conversationId', conversationId)
        formData.append('options', JSON.stringify({ includeYouTube, includeImageSearch }))
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

      const chartsConversationId = resolvedConversationId ?? currentConversationId

      if (!abortControllerRef.current?.signal.aborted && chartsConversationId) {
        try {
          const chartsResponse = await fetch('/api/proxy/charts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              prompt: userContent,
              conversationId: chartsConversationId,
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
            }
          } else {
            throw new Error(await chartsResponse.text())
          }
        } catch (chartErr) {
          console.error('Chart fetch after chat failed:', chartErr)
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
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
              ...msg,
              content: "Sorry, I encountered an error while processing your request. Please try again.",
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
    }

    setMessages((prev) => [...prev, newMessage, assistantMessage])
    setInput("")
    setIsGenerating(true)

    simulateAssistant(assistantMessageId, newMessage.content, options?.experimental_attachments)
      .finally(() => {
        setIsGenerating(false)
        abortControllerRef.current = null
        void loadConversations()
        window.setTimeout(() => {
          void loadConversations()
        }, 1400)
      })
  }

  const onRateResponse = (messageId: string, rating: "thumbs-up" | "thumbs-down") => {
    console.log("Rated", messageId, rating)

    toast.success(
      rating === "thumbs-up" ? "Marked response as helpful" : "Marked response as not helpful",
      {
        description: "Thanks for your feedback!",
      }
    )
  }

  const handleOpenExternalPreview = useCallback((url: string, title?: string) => {
    setPreviewUrl(url)
    setPreviewTitle(title ?? null)
    setIsLinkPreviewOpen(true)
  }, [])

  const reservedHistoryWidth = isHistoryOpen && canDockHistory ? historySidebarWidth : 0
  const reservedPreviewWidth = isLinkPreviewOpen && canDockPreview ? previewPaneWidth : 0

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

  return (
    <div
      className="relative flex flex-col overflow-hidden bg-background text-foreground"
      style={{ minHeight: viewportHeight }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          background:
            'radial-gradient(circle at 20% 10%, rgba(99,102,241,0.10), transparent 45%), radial-gradient(circle at 80% 0%, rgba(14,165,233,0.08), transparent 40%), radial-gradient(circle at 50% 110%, rgba(99,102,241,0.06), transparent 55%)',
        }}
      />

      {/* Header */}
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-20 flex justify-center px-3 sm:px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3"
        style={{
          left: reservedHistoryWidth ? `${reservedHistoryWidth}px` : 0,
          right: reservedPreviewWidth ? `${reservedPreviewWidth}px` : 0,
        }}
      >
        <div className="flex w-full max-w-7xl items-center justify-between rounded-[28px] border border-border/60 bg-background/70 px-4 shadow-sm backdrop-blur-xl transition-all duration-300 sm:px-8">
          <div className="flex h-[60px] w-full items-center justify-between gap-3 sm:gap-6 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto]">
            {/* Left Section - Logo */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LunaIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className={`${playfair.className} text-[15px] font-semibold leading-snug tracking-tight`}>
                  Luna
                  <span className="text-muted-foreground">AI</span>
                </h1>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground/70 shadow-sm backdrop-blur-md transition-colors duration-200 hover:bg-background/85 hover:text-foreground md:hidden"
              onClick={() => {
                setIsHistoryOpen(false)
                setIsProfileOpen(false)
                setIsMobileMenuOpen((value) => !value)
              }}
              aria-label="Open navigation"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Primary Actions */}
            <div className="hidden items-center gap-3 md:flex md:justify-center md:justify-self-center">
              <button
                type="button"
                className={desktopActionClasses}
                onClick={startNewChat}
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New chat
                  {/* <span className="ml-1 text-[12px] text-muted-foreground ">⌘ + N</span> */}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0f62fe]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover/nav:opacity-100 dark:via-[#82aaff]/20"
                />
              </button>

              <div className="relative history-dropdown">
                <button
                  type="button"
                  className={desktopActionClasses}
                  onClick={() => {
                    setIsProfileOpen(false)
                    setIsHistoryOpen((value) => {
                      const next = !value
                      if (next && !isHistoryLoading && conversations.length === 0) {
                        void loadConversations()
                      }
                      if (!next) {
                        setHistoryQuery("")
                      }
                      return next
                    })
                  }}
                >
                  <span className="relative z-10 inline-flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span>History</span>
                  </span>
                </button>

                {false && (
                  <div className="absolute left-1/2 top-full z-50 mt-3 w-[460px] -translate-x-1/2 origin-top rounded-[30px] border border-border/60 bg-background/90 p-2 shadow-[0_30px_100px_rgba(15,23,42,0.18)] backdrop-blur-2xl transition-all">
                    <div className="space-y-4 rounded-[24px] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-4 py-4 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(10,15,28,0.92))]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent chats</p>
                          <p className="text-xs text-muted-foreground">Search, reopen, and manage saved threads</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full border border-primary/15 px-3 text-xs text-primary"
                          onClick={startNewChat}
                          type="button"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          New
                        </Button>
                      </div>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={historyQuery}
                          onChange={(event) => setHistoryQuery(event.target.value)}
                          placeholder="Search conversations"
                          className="h-11 rounded-[18px] border border-border/60 bg-background/90 pl-9 pr-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/25"
                        />
                      </div>
                    </div>

                    <div className="max-h-[24rem] overflow-y-auto overflow-x-hidden rounded-[24px] border border-border/60 bg-background/65 p-2">
                      {isHistoryLoading ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          Loading conversations...
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No conversations yet
                        </div>
                      ) : filteredHistory.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No chats found for “{historyQuery}”
                        </div>
                      ) : (
                        <ul className="py-1">
                          {filteredHistory.map((conversation) => {
                            const isActive = currentConversationId === conversation.id
                            const timestamp = formatConversationDate(conversation.updated_at ?? conversation.created_at)
                            const initial = (conversation.title || "C").slice(0, 1).toUpperCase()

                            return (
                              <li key={conversation.id}>
                                <div className={`group flex items-center gap-3 rounded-[20px] px-2 py-1.5 ${isActive ? 'bg-primary/8' : ''}`}>
                                  <button
                                    className={`flex min-w-0 flex-1 items-center gap-3 rounded-[18px] border px-3 py-3 text-left shadow-sm ${isActive ? 'border-primary/25 bg-[linear-gradient(180deg,rgba(37,99,235,0.08),rgba(255,255,255,0.88))] dark:bg-[linear-gradient(180deg,rgba(37,99,235,0.18),rgba(15,23,42,0.88))]' : 'border-border/50 bg-background/70 hover:bg-background/90'}`}
                                    onClick={() => handleConversationSelect(conversation.id)}
                                    type="button"
                                  >
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200'}`}>
                                      {initial}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm font-semibold text-foreground">
                                        {conversation.title || `Chat ${conversation.id.slice(0, 6)}`}
                                      </div>
                                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span className="truncate">{isActive ? 'Current thread' : 'Saved conversation'}</span>
                                        {timestamp && <span className="shrink-0">{timestamp}</span>}
                                      </div>
                                    </div>
                                    {loadingConversationId === conversation.id && (
                                      <span className="shrink-0 text-xs text-primary">Loading...</span>
                                    )}
                                  </button>
                                  <button
                                    className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    onClick={(event) => handleDeleteConversation(conversation.id, event)}
                                    title="Delete conversation"
                                    type="button"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className={desktopActionClasses}
                onClick={() => toast("Library is coming soon")}
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Library</span>
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0f62fe]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover/nav:opacity-100 dark:via-[#82aaff]/20"
                />
              </button>

              <button
                type="button"
                className={desktopActionClasses}
                onClick={() => setIsFeedbackOpen(true)}
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Feedback</span>
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0f62fe]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover/nav:opacity-100 dark:via-[#82aaff]/20"
                />
              </button>
            </div>

            {/* Desktop Secondary Actions */}
            <div className="hidden items-center gap-3 md:flex md:justify-self-end">
              <div className="relative profile-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryOpen(false)
                    setIsProfileOpen((value) => !value)
                  }}
                  className={desktopProfileButtonClasses}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                >
                  <div className="relative z-10 flex min-w-0 items-center gap-3">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={displayName || "User avatar"}
                        className="h-7 w-7 rounded-full border border-white/40 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {userInitial}
                      </div>
                    )}
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold text-current">Profile</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-current transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0f62fe]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover/profile:opacity-100 dark:via-[#82aaff]/20"
                  />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-3 w-64 rounded-3xl border border-border/60 bg-background/80 p-4 shadow-lg backdrop-blur-xl">
                    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-3">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={displayName || "User avatar"}
                          className="h-12 w-12 rounded-full border border-border/60 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                          {userInitial}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{displayName}</div>
                        {displayEmail ? (
                          <div className="truncate text-xs text-muted-foreground">{displayEmail}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <Button
                        onClick={() => {
                          setIsProfileOpen(false)
                          logout()
                        }}
                        variant="ghost"
                        className="w-full justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-background/80"
                      >
                        Logout
                        <LogOut className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-2 text-sm font-medium">
                        <span>Theme</span>
                        <ThemeToggle />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>



        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div
              className="fixed inset-x-0 z-40 px-4 md:hidden"
              style={{ top: layoutHeights.header + 16 }}
            >
              <div className="mx-auto mb-4 max-w-6xl rounded-3xl border border-white/70 bg-white/80 shadow-[0_18px_50px_rgba(15,17,26,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111119]/85 dark:shadow-[0_22px_60px_rgba(0,0,0,0.7)]">
                <div className="space-y-5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={displayName || "User avatar"}
                          className="h-14 w-14 rounded-full border border-white/60 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0f66ff] to-[#4a8dff] text-xl font-semibold text-white">
                          {userInitial}
                        </div>
                      )}
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {displayName}
                        </span>
                        {displayEmail ? (
                          <span className="truncate text-xs text-slate-500 dark:text-slate-300">{displayEmail}</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-500 shadow-[0_10px_26px_rgba(15,17,26,0.18)] transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f62fe]/40 dark:border-white/15 dark:bg-white/10 dark:text-slate-300 dark:hover:text-white dark:focus-visible:ring-[#82aaff]/40"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={startNewChat}
                      variant="secondary"
                      className="justify-start gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Start new chat
                    </Button>
                    <Button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        setIsFeedbackOpen(true)
                      }}
                      variant="secondary"
                      className="justify-start gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Feedback
                    </Button>
                    <Button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        logout()
                      }}
                      variant="outline"
                      className="justify-start gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                      <History className="h-4 w-4" />
                      Recent conversations
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
                      onClick={() => loadConversations()}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-[24px] border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                    {isHistoryLoading ? (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        Loading conversations...
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        No conversations yet
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                        {conversations.map((conversation) => {
                          const isActive = currentConversationId === conversation.id
                          const timestamp = formatConversationDate(conversation.updated_at ?? conversation.created_at)

                          const initial = (conversation.title || "C").slice(0, 1).toUpperCase()

                          return (
                            <li key={conversation.id}>
                              <button
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${isActive
                                  ? 'bg-[#eaf2ff] text-[#0b84ff] shadow-inner dark:bg-[#0d1a2f] dark:text-[#73b3ff]'
                                  : 'hover:bg-white/80 dark:hover:bg-white/10'
                                  }`}
                                onClick={() => handleConversationSelect(conversation.id)}
                                type="button"
                              >
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${isActive ? 'bg-[#0b84ff] text-white' : 'bg-white/70 text-slate-700 dark:bg-white/10 dark:text-slate-200'}`}>
                                  {initial}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-semibold">
                                    {conversation.title || `Chat ${conversation.id.slice(0, 6)}`}
                                  </div>
                                  {timestamp && (
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      {timestamp}
                                    </div>
                                  )}
                                </div>
                                <button
                                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-white/10 dark:hover:text-red-300"
                                  onClick={(event) => handleDeleteConversation(conversation.id, event)}
                                  title="Delete conversation"
                                  type="button"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Theme
                    </span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {isHistoryOpen && canDockHistory && (
        <aside
          className="fixed bottom-0 left-0 z-40 hidden border-r border-border/60 bg-background/90 backdrop-blur-2xl md:block"
          style={{
            top: 0,
            width: historySidebarWidth,
          }}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-border/60 px-4 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Recent chats</p>
                  <p className="text-xs text-muted-foreground">Open and manage your saved conversations</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full border border-border/60"
                  onClick={() => {
                    setIsHistoryOpen(false)
                    setHistoryQuery("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 justify-center gap-2"
                  onClick={startNewChat}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  New chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-border/60"
                  onClick={() => loadConversations()}
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="Search chats"
                  className="h-11 rounded-2xl border border-border/60 bg-background pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {isHistoryLoading ? (
                <div className="rounded-2xl border border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  No conversations yet
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="rounded-2xl border border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  No chats found for "{historyQuery}"
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {filteredHistory.map((conversation) => {
                    const isActive = currentConversationId === conversation.id
                    const timestamp = formatConversationDate(conversation.updated_at ?? conversation.created_at)

                    return (
                      <li key={conversation.id}>
                        <div className="group flex items-center gap-2 rounded-2xl px-2 py-1">
                          <button
                            className={`min-w-0 flex-1 rounded-[18px] px-3 py-3 text-left transition-colors ${isActive ? 'bg-primary/10 text-foreground ring-1 ring-primary/20' : 'hover:bg-muted/60'}`}
                            onClick={() => handleConversationSelect(conversation.id)}
                            type="button"
                          >
                            <div className="truncate text-sm font-medium">
                              {conversation.title || `Chat ${conversation.id.slice(0, 6)}`}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="truncate">{isActive ? 'Current chat' : 'Saved chat'}</span>
                              {timestamp ? <span className="shrink-0">{timestamp}</span> : null}
                              {loadingConversationId === conversation.id ? <span className="shrink-0 text-primary">Loading...</span> : null}
                            </div>
                          </button>
                          <button
                            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            onClick={(event) => handleDeleteConversation(conversation.id, event)}
                            title="Delete conversation"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          minHeight: viewportHeight,
          paddingTop: messages.length > 0 ? `${layoutHeights.header}px` : 0,
          paddingBottom: messages.length > 0 ? `${layoutHeights.footer}px` : 0,
          paddingLeft: reservedHistoryWidth ? `${reservedHistoryWidth}px` : 0,
          paddingRight: reservedPreviewWidth ? `${reservedPreviewWidth}px` : 0,
        }}
      >
        <div className={`h-full ${messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          <div className={`min-h-full px-4 sm:px-6 ${messages.length === 0 ? '' : 'py-6 sm:py-8'}`}>
            <div className="mx-auto w-full max-w-4xl">
              {messages.length === 0 ? (
                <div
                  className="fixed inset-x-0 grid place-items-center px-4 sm:px-6"
                  style={{
                    top: layoutHeights.header,
                    bottom: layoutHeights.footer,
                    left: reservedHistoryWidth ? `${reservedHistoryWidth}px` : 0,
                    right: reservedPreviewWidth ? `${reservedPreviewWidth}px` : 0,
                  }}
                >
                  <div className="relative mx-auto max-w-2xl space-y-10 px-6 pb-16 pt-20 text-center text-slate-800 dark:text-slate-200">
                    <div className="flex flex-col items-center gap-5">
                    
                      <div className="relative">
                        <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(15,98,254,0.22),transparent_65%)] blur-2xl opacity-60 transition-opacity duration-700 dark:bg-[radial-gradient(circle_at_center,rgba(130,170,255,0.24),transparent_65%)]" />
                        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,rgba(15,98,254,0.18),rgba(255,255,255,0),rgba(82,112,255,0.28),rgba(255,255,255,0))] blur-3xl opacity-30 animate-[spin_18s_linear_infinite] dark:bg-[conic-gradient(from_0deg,rgba(130,170,255,0.25),rgba(255,255,255,0),rgba(66,152,255,0.32),rgba(255,255,255,0))]" />
                        <h2
                          className={`${playfair.className} relative flex flex-wrap items-baseline justify-center gap-2 text-4xl leading-snug tracking-tight text-slate-900 sm:flex-nowrap sm:text-[2.7rem] dark:text-white`}
                        >
                          <span className="text-slate-900 dark:text-white">{salutation}</span>
                          <span className="text-slate-800/60 dark:text-white/60">,</span>
                          <span className="bg-gradient-to-r from-[#101320] via-[#0f62fe] to-[#101320] bg-clip-text text-4xl font-semibold italic text-transparent sm:text-[2.8rem] dark:from-white/60 dark:via-[#82aaff] dark:to-white/60 whitespace-nowrap">
                            {firstName}
                          </span>
                        </h2>
                      </div>
                      <p className="max-w-xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
                        I’m primed to craft strategy, decode insights, and surface opportunities tailored for you.
                      </p>
                    </div>

                    {/* <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                      {["Generate immersive reports", "Track market shifts", "Ideate new strategies"].map((badge) => (
                        <div
                          key={badge}
                          className="group/badge relative overflow-hidden rounded-full border border-white/70 bg-white/80 px-5 py-2 text-xs font-medium text-slate-600 shadow-[0_12px_30px_rgba(15,17,26,0.14)] transition-all hover:-translate-y-1 hover:border-[#0f62fe]/40 hover:bg-white hover:text-[#0f62fe] dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:shadow-[0_18px_45px_rgba(0,0,0,0.55)] dark:hover:border-[#82aaff]/40 dark:hover:text-[#82aaff]"
                        >
                          <span className="relative z-10">{badge}</span>
                          <span className="absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-[#0f62fe]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover/badge:opacity-100 dark:via-[#82aaff]/20" />
                        </div>
                      ))}
                    </div> */}

                    
                  </div>
                </div>
              ) : (
                <div className="relative w-full space-y-6">
                  <MessageList
                    messages={messages}
                    messageOptions={(message) => {
                      if (message.role === "user") {
                        return {}
                      }

                      return {
                        actions: onRateResponse ? (
                          <>
                            <div className="border-r pr-1 flex items-center gap-1">
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
                              onClick={() => {
                                if (onRateResponse) {
                                  onRateResponse(message.id, "thumbs-up")
                                }
                              }}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                if (onRateResponse) {
                                  onRateResponse(message.id, "thumbs-down")
                                }
                              }}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            <TTSButton content={message.content} />
                            <CopyButton
                              content={message.content}
                              copyMessage="Copied response to clipboard!"
                            />
                          </div>
                        ),
                        isComplete: message.isComplete,
                        onOpenExternalPreview: handleOpenExternalPreview,
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div
        ref={footerRef}
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/50 bg-background/75 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
        style={{
          left: reservedHistoryWidth ? `${reservedHistoryWidth}px` : 0,
          right: reservedPreviewWidth ? `${reservedPreviewWidth}px` : 0,
        }}
      >
        <div className="relative mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <ChatForm
            isPending={isGenerating}
            handleSubmit={handleSubmit}
          >
            {({ files, setFiles }) => (
              <div className="relative">
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <SuggestionDropdown
                    suggestions={filteredSuggestions}
                    onSelect={handleSuggestionSelect}
                    inputValue={input}
                    className="w-full"
                  />
                )}
                <MessageInput
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSuggestions(false)
                    }
                  }}
                  stop={stop}
                  isGenerating={isGenerating}
                  transcribeAudio={transcribeAudio}
                  inputRef={inputRef}
                  allowAttachments
                  files={files}
                  setFiles={setFiles}
                  includeYouTube={includeYouTube}
                  onToggleYouTube={(next: boolean) => setIncludeYouTube(next)}
                  includeImageSearch={includeImageSearch}
                  onToggleImageSearch={(next: boolean) => setIncludeImageSearch(next)}
                />
              </div>
            )}
          </ChatForm>
        </div>
      </div>
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
        topOffset={layoutHeights.header}
        bottomOffset={layoutHeights.footer}
        width={previewPaneWidth}
        onClose={() => setIsLinkPreviewOpen(false)}
      />
    </div>
  )
}
