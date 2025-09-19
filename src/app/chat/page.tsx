"use client"

import React, { useCallback, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { ChatForm } from "@/components/ui/chat"
import { type Message } from "@/components/ui/chat-message"
import { CopyButton } from "@/components/ui/copy-button"
import { MessageInput } from "@/components/ui/message-input"
import { MessageList } from "@/components/ui/message-list"
import { PromptSuggestions } from "@/components/ui/prompt-suggestions"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Toaster } from "@/components/ui/sonner"
import { ThumbsUp, ThumbsDown, Search, Sparkles, RotateCcw, LogOut, Moon, Sun } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"


export default function ChatPage() {
  const { logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  const suggestions = useMemo(
    () => [
     
    ],
    []
  )
    
  const append = useCallback((message: { role: "user"; content: string }) => {
    setInput(message.content)
  }, [])

  const handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setInput(e.target.value)
  }

  const createNewConversation = async (title: string) => {
    try {
      const response = await fetch('/api/proxy/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'New Conversation'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const simulateAssistant = async (userContent: string) => {
    try {
      console.log('Sending request to API with prompt:', userContent);
      
      // Create a new conversation if we don't have one
      let conversationId = currentConversationId;
      if (!conversationId) {
        try {
          conversationId = await createNewConversation(userContent.substring(0, 30));
          setCurrentConversationId(conversationId);
        } catch (error) {
          console.error('Error creating new conversation, continuing without conversation context:', error);
        }
      }
      
      const response = await fetch('/api/proxy/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userContent,
          conversationId: conversationId,
          userId: 'user-1' // In a real app, get this from auth context
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(errorText || 'Failed to get response from the API');
      }

      const data = await response.json();
      
      // Update conversation ID if this is a new conversation
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

    simulateAssistant(newMessage.content).finally(() => setIsGenerating(false))
  }

  const stop = () => {
    setIsGenerating(false)
  }

  const onRateResponse = (messageId: string, rating: "thumbs-up" | "thumbs-down") => {
    console.log("Rated", messageId, rating)
  }

  const transcribeAudio = async (_blob: Blob) => {
    await new Promise((r) => setTimeout(r, 600))
    return "This is a mock transcription from audio."
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 border-b border-gray-100 dark:border-gray-800/50 bg-background/80 backdrop-blur-xl">
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
              <Button
                onClick={() => setMessages([])}
                variant="ghost"
                size="sm"
                className="h-10 border border-gray-100 dark:border-gray-800/50 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm"
              >
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

      
      {/* Main Content - Add padding to account for fixed header and footer */}
      <div className="flex-1 overflow-hidden pt-16 pb-24 md:pb-28">
        <div className={`h-full ${messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          <div className={`min-h-full flex ${messages.length === 0 ? 'items-center justify-center' : ''} px-4 sm:px-6 py-4`}>
            <div className="w-full max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-12 py-16">
                  {/* Hero Section - Centered */}
                  <div className="text-center space-y-6 max-w-lg">
                    <div className="relative">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 flex items-center justify-center mb-6">
                        <Sparkles className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h2 className="text-2xl font-normal text-gray-900 dark:text-white">
                        How can I help you today?
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Get instant insights, market research, and business analysis
                      </p>
                    </div>
                  </div>
                  
                  {/* Suggestions - Centered */}
                  <div className="w-full max-w-2xl">
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Try asking about these topics
                      </p>
                      <PromptSuggestions
                        label=""
                        append={append}
                        suggestions={suggestions}
                      />
                    </div>
                  </div>
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
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-100 dark:border-gray-800/50 bg-white/80 dark:bg-[#080809]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <ChatForm
            isPending={isGenerating}
            handleSubmit={handleSubmit}
          >
            {() => (
              <MessageInput
                value={input}
                onChange={handleInputChange}
                stop={stop}
                isGenerating={isGenerating}
                transcribeAudio={transcribeAudio}
              />
            )}
          </ChatForm>
        </div>
      </div>
      
      <Toaster position="top-center" richColors />
    </div>
  )
}