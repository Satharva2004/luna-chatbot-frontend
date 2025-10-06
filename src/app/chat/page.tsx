"use client"

import React, { useCallback, useMemo, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChatForm } from "@/components/ui/chat"
import { type Message } from "@/components/ui/chat-message"
import { CopyButton } from "@/components/ui/copy-button"
import { MessageInput } from "@/components/ui/message-input"
import { MessageList } from "@/components/ui/message-list"
import {
  createInitialAssistantStatuses,
  type AssistantStatusMap,
} from "@/components/ui/typing-indicator"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Toaster } from "@/components/ui/sonner"
import { ThumbsUp, ThumbsDown, Search, Sparkles, LogOut, History, Plus, Trash2, RotateCcw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { SuggestionDropdown } from "@/components/ui/suggestion-dropdown"
import { fuzzySearch } from "@/services/suggestions/fuzzy"
import { Playfair_Display } from "next/font/google"

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

export default function ChatPage() {
  const { logout, token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Track header/footer sizes so we can center content in the remaining viewport on mobile
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const [layoutHeights, setLayoutHeights] = useState<{ header: number; footer: number }>({ header: 64, footer: 96 })
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null)
  const [assistantStatuses, setAssistantStatuses] = useState<AssistantStatusMap>(
    createInitialAssistantStatuses()
  )

  useEffect(() => {
    const measure = () => {
      const h = headerRef.current?.getBoundingClientRect().height ?? 64
      const f = footerRef.current?.getBoundingClientRect().height ?? 96
      setLayoutHeights({ header: Math.round(h), footer: Math.round(f) })
    }
    measure()
    // Re-measure on resize and when virtual keyboard / URL bar changes viewport
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    window.addEventListener('load', measure)
    document.addEventListener('visibilitychange', measure)
    // If fonts cause layout shift, re-measure after they load
    // @ts-ignore - fonts may be undefined in some environments
    if (document.fonts?.ready) {
      // @ts-ignore
      document.fonts.ready.then(() => measure()).catch(() => {})
    }
    // Run a micro and macro task re-measure to catch late layout shifts
    requestAnimationFrame(() => measure())
    const t = setTimeout(measure, 300)
    const roHeader = headerRef.current ? new ResizeObserver(measure) : null
    const roFooter = footerRef.current ? new ResizeObserver(measure) : null
    if (headerRef.current && roHeader) roHeader.observe(headerRef.current)
    if (footerRef.current && roFooter) roFooter.observe(footerRef.current)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.removeEventListener('load', measure)
      document.removeEventListener('visibilitychange', measure)
      roHeader?.disconnect()
      roFooter?.disconnect()
      clearTimeout(t)
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

  const normalizeConversationSummary = useCallback((conversation: any): ConversationSummary | null => {
    if (!conversation || typeof conversation !== "object" || !conversation.id) return null

    const id = String(conversation.id)
    const rawTitle = conversation.title ?? conversation.name ?? ""
    const title = String(rawTitle).trim() || `Chat ${id.slice(0, 6) || id}`
    const updatedAt = conversation.updated_at ?? conversation.updatedAt ?? conversation.created_at ?? conversation.createdAt ?? null
    const createdAt = conversation.created_at ?? conversation.createdAt ?? conversation.updated_at ?? conversation.updatedAt ?? null

    return {
      id,
      title,
      updated_at: updatedAt ?? null,
      created_at: createdAt ?? null,
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

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
    setAssistantStatuses(createInitialAssistantStatuses())
  }, [])

  const startNewChat = useCallback(() => {
    stop()
    setMessages([])
    setCurrentConversationId(null)
    setInput("")
    setShowSuggestions(false)
    setIsHistoryOpen(false)
    setLoadingConversationId(null)
    setIsMobileMenuOpen(false)
    setAssistantStatuses(createInitialAssistantStatuses())
  }, [stop])

  const normalizeMessageFromHistory = useCallback((message: any): Message => {
    const role = message?.role === 'model' ? 'assistant' : message?.role ?? 'assistant'
    const createdAtIso = message?.created_at ?? message?.createdAt
    return {
      id: message?.id ? String(message.id) : crypto.randomUUID(),
      role: role === 'assistant' || role === 'user' || role === 'system' ? role : 'assistant',
      content: message?.content ?? '',
      createdAt: createdAtIso ? new Date(createdAtIso) : undefined,
      sources: Array.isArray(message?.sources) ? message.sources : undefined,
      chartUrl: typeof message?.charts === 'string' ? message.charts : Array.isArray(message?.charts) ? message.charts[0] : undefined,
      chartUrls: Array.isArray(message?.charts)
        ? message.charts.filter((url: unknown): url is string => typeof url === 'string' && url.trim().length > 0)
        : (typeof message?.charts === 'string' && message.charts.trim().length > 0)
          ? [message.charts]
          : undefined,
    }
  }, [])

  const handleConversationSelect = useCallback(async (conversationId: string) => {
    stop()
    setIsHistoryOpen(false)
    setIsMobileMenuOpen(false)
    setLoadingConversationId(conversationId)
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

      setMessages(historyMessages)
      setCurrentConversationId(data?.id ? String(data.id) : conversationId)
      setInput("")
      setShowSuggestions(false)
      setIsGenerating(false)
      setAssistantStatuses(createInitialAssistantStatuses())
    } catch (error) {
      console.error('Failed to load conversation history', error)
    } finally {
      setLoadingConversationId(null)
    }
  }, [normalizeMessageFromHistory, stop, token])

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

  const append = useCallback((message: { role: "user"; content: string }) => {
    setInput(message.content)
  }, [])

  const handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setInput(e.target.value)
    setShowSuggestions(e.target.value.length > 0)
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setInput(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const simulateAssistant = async (userContent: string, attachments?: FileList) => {
    try {
      console.log('Starting streaming request with prompt:', userContent);
      
      const conversationId = currentConversationId;
      // Create abort controller for stream cancellation
      abortControllerRef.current = new AbortController();
      
      // Build request
      let response: Response;
      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        formData.append('prompt', userContent);
        if (conversationId) formData.append('conversationId', conversationId);
        Array.from(attachments).forEach((file) => {
          formData.append('files', file, file.name);
        });

        response = await fetch(`/api/proxy/chat/stream`, {
          method: 'POST',
          body: formData,
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          signal: abortControllerRef.current.signal,
        });
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
          }),
          signal: abortControllerRef.current.signal,
        });
      }
      

      // Ensure request succeeded before reading stream
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(errorText || 'Failed to get response from the API');
      }

      setAssistantStatuses((prev: AssistantStatusMap) => ({
        ...prev,
        searching: "complete",
        responding: "active",
      }))

      // Create assistant message placeholder
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
        sources: [],
        chartUrl: null,
        chartUrls: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      let resolvedConversationId: string | null = conversationId || null;

      // Process SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedContent = '';
      let streamedSources: string[] = [];
      let streamedSourceObjs: Array<{ url?: string; title?: string }> = [];
      let currentEvent = '';

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) {
            // Empty line indicates end of event
            currentEvent = '';
            continue;
          }
          
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (!data) continue;
            
            try {
              const parsed = JSON.parse(data);
              
              // Handle conversationId event
              if (parsed.conversationId) {
                console.log('Setting conversation ID:', parsed.conversationId);
                resolvedConversationId = parsed.conversationId;
                if (parsed.conversationId !== currentConversationId) {
                  setCurrentConversationId(parsed.conversationId);
                }
              }
              
              // Handle message text chunks
              if (parsed.text && typeof parsed.text === 'string') {
                streamedContent += parsed.text;
                console.log('📝 Streaming text chunk:', parsed.text.substring(0, 50), '... Total length:', streamedContent.length);
                
                // Force update with new content
                setMessages((prev) => {
                  const updated = prev.map((msg) => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: streamedContent, createdAt: new Date() }
                      : msg
                  );
                  return updated;
                });
              }
              
              // Handle sources
              if (parsed.sources && Array.isArray(parsed.sources)) {
                streamedSourceObjs = parsed.sources;
                streamedSources = parsed.sources;
                console.log('📚 Received sources:', streamedSources.length);
                setMessages((prev) => 
                  prev.map((msg) => 
                    msg.id === assistantMessageId 
                      ? { ...msg, sources: streamedSources as any }
                      : msg
                  )
                );
              }

              // Handle finish
              if (parsed.finishReason) {
                console.log('✅ Stream finished with reason:', parsed.finishReason);
              }
              
              // Handle errors
              if (parsed.error) {
                console.error('❌ Stream error:', parsed.error);
                throw new Error(parsed.error);
              }
              
            } catch (parseError) {
              if (data !== '[DONE]') {
                console.warn('Failed to parse SSE data:', data, parseError);
              }
            }
          }
        }
      }

      // Final update with timestamp - do not append separate markdown sources block
      const finalContent = (streamedContent || "I couldn't fetch the details. Please try again later.");

      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: finalContent,
                sources: streamedSources,
                chartUrl: msg.chartUrl,
                chartUrls: msg.chartUrls ?? [],
                createdAt: new Date()
              }
            : msg
        )
      );

      setAssistantStatuses((prev: AssistantStatusMap) => ({
        ...prev,
        responding: "complete",
      }));

      const chartsConversationId = resolvedConversationId ?? currentConversationId;

      if (!abortControllerRef.current?.signal.aborted && chartsConversationId) {
        setAssistantStatuses((prev: AssistantStatusMap) => ({
          ...prev,
          charting: "active",
        }));

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
              options: { includeSearch: true },
            }),
          });

          if (chartsResponse.ok) {
            const chartData = await chartsResponse.json();
            const chartUrlFromResponse = chartData?.chartUrl || chartData?.charts?.chartUrl;

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
              );
            }

            setAssistantStatuses((prev: AssistantStatusMap) => ({
              ...prev,
              charting: "complete",
            }));
          } else {
            throw new Error(await chartsResponse.text());
          }
        } catch (chartErr) {
          console.error('Chart fetch after chat failed:', chartErr);
          setAssistantStatuses((prev: AssistantStatusMap) => ({
            ...prev,
            charting: "pending",
          }));
        }
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream was aborted by user');
        return;
      }
      
      console.error('Error in streaming:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setAssistantStatuses(createInitialAssistantStatuses())
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

    setMessages((prev) => [...prev, newMessage])
    setInput("")
    setIsGenerating(true)

    simulateAssistant(newMessage.content, options?.experimental_attachments)
      .finally(() => {
        setIsGenerating(false)
        abortControllerRef.current = null
      })
  }

  const onRateResponse = (messageId: string, rating: "thumbs-up" | "thumbs-down") => {
    console.log("Rated", messageId, rating)
  }

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      if (data.success && data.text) {
        return data.text;
      } else {
        throw new Error('No transcription returned');
      }
    } catch (error) {
      console.error('Error in speech-to-text:', error);
      throw error;
    }
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) return
    loadConversations()
  }, [isMobileMenuOpen, loadConversations])

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isHistoryOpen && !(event.target as Element).closest('.history-dropdown')) {
        setIsHistoryOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHistoryOpen]);

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-10 border-b border-gray-100 dark:border-gray-800/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <div className="w-full flex items-center justify-between">
            {/* Left Section - Logo */}
            <div className="flex items-center gap-3 h-full">
              <div className="w-7 h-7 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                <Search className="w-4 h-4 text-white dark:text-black" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base leading-tight">
                  Luna Research
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Powered by AI</p>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden ">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12 "
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {/* History Dropdown */}
              <div className="relative history-dropdown">
                <button
                  className="h-10 gap-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md px-3 py-2 text-sm font-medium bg-background text-foreground flex items-center transition-colors"
                  onClick={() => setIsHistoryOpen((value) => {
                    const next = !value
                    if (next && !isHistoryLoading && conversations.length === 0) {
                      void loadConversations()
                    }
                    return next
                  })}
                  type="button"
                >
                  <History className="h-4 w-4" />
                  <span>History</span>
                </button>

                {isHistoryOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-80 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Chat history</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Select a conversation to resume</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-blue-600 dark:text-blue-400"
                        onClick={startNewChat}
                        type="button"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New
                      </Button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {isHistoryLoading ? (
                        <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                          Loading conversations...
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No conversations yet
                        </div>
                      ) : (
                        <ul className="py-1">
                          {conversations.map((conversation) => {
                            const isActive = currentConversationId === conversation.id
                            const timestamp = formatConversationDate(conversation.updated_at ?? conversation.created_at)

                            return (
                              <li key={conversation.id}>
                                <div className={`flex items-center gap-1 px-2 py-1 ${isActive ? 'bg-gray-100 dark:bg-gray-700/60' : ''}`}>
                                  <button
                                    className="flex-1 rounded-md px-2 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => handleConversationSelect(conversation.id)}
                                    type="button"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="truncate text-gray-900 dark:text-gray-100">
                                        {conversation.title || `Chat ${conversation.id.slice(0, 6)}`}
                                      </span>
                                      {timestamp && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                          {timestamp}
                                        </span>
                                      )}
                                    </div>
                                    {loadingConversationId === conversation.id && (
                                      <span className="mt-1 block text-xs text-blue-600 dark:text-blue-400">Loading...</span>
                                    )}
                                  </button>
                                  <button
                                    className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
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
              <Button
                onClick={startNewChat}
                variant="ghost"
                size="sm"
                className="h-10 border border-gray-100 dark:border-gray-800/50 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                New chat
              </Button>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="h-10 border border-gray-100 dark:border-gray-800/50 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm"
              >
                Logout
              </Button>
              <div className="h-10 flex items-center">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed inset-x-0 top-16 z-40 md:hidden">
              <div className="mx-4 mb-4 rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#0f0f12]">
                <div className="p-4 space-y-4">
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
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <History className="h-4 w-4" />
                      Recent conversations
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      onClick={() => loadConversations()}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
                    {isHistoryLoading ? (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Loading conversations...
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No conversations yet
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                        {conversations.map((conversation) => {
                          const isActive = currentConversationId === conversation.id
                          const timestamp = formatConversationDate(conversation.updated_at ?? conversation.created_at)

                          return (
                            <li key={conversation.id}>
                              <button
                                className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors ${
                                  isActive
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => handleConversationSelect(conversation.id)}
                                type="button"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="truncate font-medium">
                                    {conversation.title || `Chat ${conversation.id.slice(0, 6)}`}
                                  </div>
                                  {timestamp && (
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                      {timestamp}
                                    </div>
                                  )}
                                </div>
                                <button
                                  className="p-1.5 text-gray-400 transition-colors hover:text-red-500"
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

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
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

      
      {/* Main Content */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          minHeight: '100dvh',
          paddingTop: messages.length > 0 ? `${layoutHeights.header}px` : 0,
          paddingBottom: messages.length > 0
            ? `calc(${layoutHeights.footer}px + env(safe-area-inset-bottom, 0px))`
            : 0,
        }}
      >
        <div className={`h-full ${messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          <div className={`min-h-full px-4 sm:px-6 ${messages.length === 0 ? '' : 'py-4'}`}>
            <div className="w-full max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div
                  className="fixed inset-x-0 grid place-items-center px-4 sm:px-6"
                  style={{
                    top: layoutHeights.header,
                    bottom: layoutHeights.footer,
                  }}
                >
                  <div className="relative text-center space-y-3 max-w-lg mx-auto pt-16">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h2 className={`${playfair.className} text-3xl text-gray-900 dark:text-white font-semibold`}>
                        How can I help you today?
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Get instant insights, market research, and business analysis
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-background/50 backdrop-blur-sm rounded-lg p-6">
                  <div className="w-full">
                    <MessageList
                      messages={messages}
                      isTyping={isGenerating}
                      typingStatuses={assistantStatuses}
                      messageOptions={(message) => ({
                        actions: onRateResponse ? (
                          <>
                            <div className="border-r pr-1">
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
                        ) : (
                          <CopyButton
                            content={message.content}
                            copyMessage="Copied response to clipboard!"
                          />
                        ),
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Input Area */}
      <div ref={footerRef} className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-100 dark:border-gray-800/50 bg-white/80 dark:bg-[#080809]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 relative">
          <div className="relative">
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
                  />
                </div>
              )}
            </ChatForm>
          </div>
        </div>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  )
}