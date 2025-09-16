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
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { MessageSquare } from "lucide-react"

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const suggestions = useMemo(
    () => [
      "What are the common challenges in scaling a startup? Provide case studies.",
      "List key performance indicators (KPIs) for tracking sales growth",
      "Research the top trends and tools in e-commerce for 2025."
    ],
    []
  )

  const append = useCallback((message: { role: "user"; content: string }) => {
    setInput(message.content)
  }, [])

  const handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setInput(e.target.value)
  }

  const simulateAssistant = async (userContent: string) => {
    try {
      console.log('Sending request to API with prompt:', userContent);
      const response = await fetch('/api/proxy/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userContent
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('API Response:', {
        content: responseData.content ? `${responseData.content.substring(0, 100)}...` : 'No content',
        sources: responseData.sources ? `Array(${responseData.sources.length})` : 'No sources',
        timestamp: responseData.timestamp || 'No timestamp'
      });
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: responseData.content || "I couldn't fetch the details. Please try again later.",
        createdAt: responseData.timestamp ? new Date(responseData.timestamp) : new Date(),
        sources: Array.isArray(responseData.sources) ? responseData.sources : [],
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

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Chat header */}
      <div className="shrink-0 p-4 border-b">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <Button onClick={() => setMessages([])} variant="outline">
              Clear Chat
            </Button>
            <CopyButton content="Copied from the CopyButton demo" copyMessage="Copied demo text!" />
          </div>
        </div>
      </div>
      
      {/* Scrollable chat area */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto">
          <div className={`min-h-full flex ${messages.length === 0 ? 'items-center justify-center' : ''} px-4 py-6`}>
            <div className="w-full max-w-4xl mx-auto">
              <div className="bg-background/50 backdrop-blur-sm rounded-lg p-6">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center space-y-8 py-12">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <MessageSquare className="w-8 h-8 text-primary" />
                    </div>
                    <div className="font-mono text-xl md:text-[1.5rem] font-semibold text-center">
                      <div>Business Research Tool</div>
                      <div className="flex items-center justify-center gap-1">
                        <span>Powered by GenAI</span>
                        <span className="inline-block w-1 h-8 bg-orange-500 dark:bg-foreground animate-pulse transition-colors duration-300"></span>
                      </div>
                    </div>
                    <PromptSuggestions
                      label=""
                      append={append}
                      suggestions={suggestions}
                    />
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fixed input area */}
      <div className="shrink-0 border-t p-4 bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto w-full">
          <ChatForm
            isPending={isGenerating}
            handleSubmit={handleSubmit}
          >
            {({ files, setFiles }) => (
              <MessageInput
                value={input}
                onChange={handleInputChange}
                allowAttachments
                files={files}
                setFiles={setFiles}
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