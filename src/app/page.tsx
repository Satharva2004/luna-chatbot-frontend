"use client"

import React, { useCallback, useMemo, useState } from "react"
import Head from 'next/head'

import { Button } from "@/components/ui/button"
import { ChatForm, ChatMessages } from "@/components/ui/chat"
import { type Message } from "@/components/ui/chat-message"
import { CopyButton } from "@/components/ui/copy-button"
import { MessageInput } from "@/components/ui/message-input"
import { MessageList } from "@/components/ui/message-list"
import { PromptSuggestions } from "@/components/ui/prompt-suggestions"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Toaster } from "@/components/ui/sonner"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { GradientBackdrop } from "@/components/ui/gradient-bg"
import { MessageSquare } from "lucide-react"

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const suggestions = useMemo(
    () => [
      "Analyze market trends for AI-powered business tools in 2024",
      "Create a competitive analysis for top business intelligence platforms",
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
    await new Promise((r) => setTimeout(r, 800))

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        `You said: "${userContent}"

Here is a code example:\n\n\`\`\`ts\nexport function add(a: number, b: number) { return a + b }\n\`\`\`\n\nAnd a list:\n- Item A\n- Item B`,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
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

  const transcribeAudio = async (blob: Blob) => {
    await new Promise((r) => setTimeout(r, 600))
    return "This is a mock transcription from audio."
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Chat header */}
      <div className="p-4 border-b">
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
      <div className="flex-1 overflow-y-auto relative">
        <div className={`relative max-w-4xl mx-auto w-full p-4 min-h-full ${messages.length === 0 ? 'flex items-center justify-center' : ''}`}>
          <div className="w-full relative z-10 bg-background/50 backdrop-blur-sm rounded-lg p-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-8 py-12">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <div className="font-silkscreen text-xl md:text-[1.5rem] font-semibold text-center">
                  <div>GenAI-Powered</div>
                  <div className="flex items-center justify-center gap-1">
                    <span>Business Research Tool</span>
                    <span className="inline-block w-1 h-8 bg-foreground color-orange animate-blink"></span>
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
      
      {/* Fixed input area */}
      <div className="border-t p-4 bg-background/80 backdrop-blur-sm sticky bottom-0">
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
