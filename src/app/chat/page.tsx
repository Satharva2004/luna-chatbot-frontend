"use client"

import React, { useCallback, useMemo, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatForm } from "@/components/ui/chat"
import { type Message } from "@/components/ui/chat-message"
import { CopyButton } from "@/components/ui/copy-button"
import { MessageInput } from "@/components/ui/message-input"
import { MessageList } from "@/components/ui/message-list"
import { PromptSuggestions } from "@/components/ui/prompt-suggestions"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Toaster } from "@/components/ui/sonner"
import { ThumbsUp, ThumbsDown, Search, Sparkles, RotateCcw, LogOut, Moon, Sun, History, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { SuggestionDropdown } from "@/components/ui/suggestion-dropdown"
import { general_chatbot_questions, fuzzySearch } from "@/services/suggestions/fuzzy"
import { Playfair_Display } from 'next/font/google'


const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
})

export default function ChatPage() {
  const { logout, token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // Track header/footer sizes so we can center content in the remaining viewport on mobile
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const [layoutHeights, setLayoutHeights] = useState<{ header: number; footer: number }>({ header: 64, footer: 96 })
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; updated_at?: string }>>([])

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

  // Load conversation list on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const resp = await fetch('/api/proxy/conversations', {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          }
        });
        if (resp.ok) {
          const data = await resp.json();
          setConversations(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load conversations', e);
      }
    };
    loadConversations();
  }, [token])

  const filteredSuggestions = useMemo(() => {
    if (!input || input.trim().length < 2) return []
    return fuzzySearch(input).slice(0, 5) // Show top 5 matching suggestions
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

  // Backend will auto-create a conversation if no conversationId is provided

  const simulateAssistant = async (userContent: string, attachments?: FileList) => {
    try {
      console.log('Sending request to API with prompt:', userContent);
      
      const conversationId = currentConversationId; // optional, backend will create if absent
      
      // Build request: if attachments present, use multipart/form-data directly to backend
      let response: Response;
      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        formData.append('prompt', userContent);
        if (conversationId) formData.append('conversationId', conversationId);
        Array.from(attachments).forEach((file) => {
          formData.append('files', file, file.name);
        });

        response = await fetch(`/api/proxy/chat`, {
          method: 'POST',
          body: formData,
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });
      } else {
        // JSON request via proxy
        response = await fetch(`/api/proxy/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            prompt: userContent,
            conversationId: conversationId || undefined,
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(errorText || 'Failed to get response from the API');
      }

      const data = await response.json();
      
      // Update conversation ID if this is a new conversation created by backend
      if (data.conversationId && data.conversationId !== currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }
      
      console.log('API Response:', {
        content: data.content ? `${data.content.substring(0, 100)}...` : 'No content',
        sources: data.sources ? `Array(${data.sources.length})` : 'No sources',
        timestamp: data.timestamp || 'No timestamp'
      });
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content || "I couldn't fetch the details. Please try again later.",
        createdAt: data.timestamp ? new Date(data.timestamp) : new Date(),
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      
      console.log('Created assistant message:', {
        content: assistantMessage.content ? `${assistantMessage.content.substring(0, 100)}...` : 'No content',
        sources: assistantMessage.sources ? `Array(${assistantMessage.sources.length})` : 'No sources',
        timestamp: assistantMessage.createdAt
      });

      console.log('Assistant Message:', assistantMessage);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

    simulateAssistant(newMessage.content, options?.experimental_attachments).finally(() => setIsGenerating(false))
  }

  const stop = () => {
    setIsGenerating(false)
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
      throw error; // Re-throw to be handled by the component
    }
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                  Eduvance Business Research
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
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}

                  
                >
                  <History className="h-4 w-4" />
                  <span>History</span>
                </button>

                {/* Dropdown Content */}
                {isHistoryOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-80 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {/* Header */}
                    <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-3">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                        Conversation History
                      </h3>
                    </div>

                    {/* New Chat Button */}
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setMessages([]);
                          setCurrentConversationId(null);
                          setIsHistoryOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                          <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span>Start New Chat</span>
                      </button>
                    </div>

                    {/* Conversations List */}
                    <ScrollArea className="max-h-80">
                      <div className="p-2">
                        {conversations.length === 0 ? (
                          <div className="px-3 py-8 text-center">
                            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <History className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No conversations yet
                            </p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              Start a new chat to see your history here
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {conversations.map((c) => (
                              <div
                                key={c.id}
                                className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 cursor-pointer transition-colors ${
                                  currentConversationId === c.id
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                onClick={async () => {
                                  try {
                                    const resp = await fetch(`/api/proxy/conversations/${c.id}`, {
                                      headers: {
                                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                      },
                                    });
                                    if (!resp.ok) {
                                      console.error('Failed to load conversation history');
                                      return;
                                    }
                                    const data = await resp.json();
                                    const msgs = (data?.messages || []).map((m: any) => ({
                                      id: m.id,
                                      role: m.role === 'user' ? 'user' : 'assistant',
                                      content: m.content,
                                      createdAt: new Date(m.created_at),
                                      sources: Array.isArray(m.sources) ? m.sources : [],
                                    })) as Message[];
                                    setCurrentConversationId(c.id);
                                    setMessages(msgs);
                                    setIsHistoryOpen(false);
                                  } catch (err) {
                                    console.error('Error loading conversation:', err);
                                  }
                                }}
                              >
                                {/* Conversation Icon */}
                                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                                  currentConversationId === c.id
                                    ? 'bg-blue-100 dark:bg-blue-800'
                                    : 'bg-gray-100 dark:bg-gray-600'
                                }`}>
                                  <History className={`h-4 w-4 ${
                                    currentConversationId === c.id
                                      ? 'text-blue-600 dark:text-blue-300'
                                      : 'text-gray-500 dark:text-gray-300'
                                  }`} />
                                </div>

                                {/* Conversation Details */}
                                <div className="flex-1 min-w-0">
                                  <h4 className={`truncate text-sm font-medium ${
                                    currentConversationId === c.id
                                      ? 'text-blue-900 dark:text-blue-100'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {c.title || 'Untitled Conversation'}
                                  </h4>
                                  <p className={`mt-0.5 text-xs ${
                                    currentConversationId === c.id
                                      ? 'text-blue-600 dark:text-blue-300'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {c.updated_at ? (() => {
                                      try {
                                        const date = new Date(c.updated_at)
                                        const now = new Date()
                                        const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

                                        if (diffInHours < 24) {
                                          return date.toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          })
                                        } else if (diffInHours < 24 * 7) {
                                          return date.toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          })
                                        } else {
                                          return date.toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          })
                                        }
                                      } catch {
                                        return ''
                                      }
                                    })() : ''}
                                  </p>
                                </div>

                                {/* Delete Button */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm('Are you sure you want to delete this conversation?')) return;
                                    try {
                                      const resp = await fetch(`/api/proxy/conversations/${c.id}`, {
                                        method: 'DELETE',
                                        headers: {
                                          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                        },
                                      });
                                      if (!resp.ok) {
                                        const txt = await resp.text();
                                        console.error('Failed to delete conversation', txt);
                                        return;
                                      }
                                      // Refresh conversations list
                                      const listResp = await fetch('/api/proxy/conversations', {
                                        headers: {
                                          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                        },
                                      });
                                      if (listResp.ok) {
                                        const data = await listResp.json();
                                        setConversations(Array.isArray(data) ? data : []);
                                      }
                                      if (currentConversationId === c.id) {
                                        setCurrentConversationId(null);
                                        setMessages([]);
                                      }
                                    } catch (e) {
                                      console.error('Delete conversation error', e);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-150"
                                  title="Delete conversation"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>

                                {/* Active Indicator */}
                                {currentConversationId === c.id && (
                                  <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Footer */}
                    {conversations.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={() => { setMessages([]); setCurrentConversationId(null); }}
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

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-0 bg-black/20 dark:bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute right-4 top-20 z-20 w-56 origin-top-right rounded-lg bg-white p-2 shadow-lg  backdrop-blur-lg dark:bg-gray-800 dark:ring-gray-700" onClick={e => e.stopPropagation()}>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setMessages([]);
                    setCurrentConversationId(null);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center rounded-md px-3 py-2.5 text-sm text-gray-800 transition-colors hover:bg-gray-100 bg=== dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  <span>New chat</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center rounded-md px-3 py-2.5 text-sm text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </button>
                <div className="border-t border-gray-200 px-1 py-1.5 dark:border-gray-700">
                  <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200">
                    <span>Appearance</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      
      {/* Main Content - Use dynamic safe padding and 100svh to keep hero centered */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          // Use dynamic viewport height for better centering in Chrome/Safari
          minHeight: '100dvh',
          // Only add padding when we have scrollable messages; for empty state we compute exact height instead
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
                    // Occupy exactly the area between the fixed header and footer
                    top: layoutHeights.header,
                    bottom: layoutHeights.footer,
                  }}
                >
                  {/* Hero Section - Centered */}
                  <div className="relative text-center space-y-3 max-w-lg mx-auto pt-16">
                    {/* Icon positioned above without affecting layout */}
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
                  
                  {/* Suggestions - Centered */}
                  {/* <div className="w-full max-w-2xl">
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Try asking about these topics
                      </p>
                      <PromptSuggestions
                        label=""
                        append={append}
                        suggestions={filteredSuggestions}
                      />
                    </div>
                  </div> */}
                </div>
              ) : (
                <div className="bg-background/50 backdrop-blur-sm rounded-lg p-6">
                  <div className="w-full">
                    <MessageList
                      messages={messages}
                      isTyping={isGenerating}
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
      
      {/* Input Area - Fixed at bottom */}
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