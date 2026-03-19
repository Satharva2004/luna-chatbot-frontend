import { useEffect, useRef } from "react"
import {
  ChatMessage,
  type ChatMessageProps,
  type Message,
} from "@/components/ui/chat-message"

type AdditionalMessageOptions = Omit<ChatMessageProps, keyof Message>

interface MessageListProps {
  messages: Message[]
  showTimeStamps?: boolean
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: Message) => AdditionalMessageOptions)
}

export function MessageList({
  messages,
  showTimeStamps = true,
  messageOptions,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef<number>(messages.length)

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    const prevCount = previousMessageCountRef.current
    const nextCount = messages.length

    if (nextCount > prevCount) {
      scrollToBottom(nextCount - prevCount === 1 ? "smooth" : "auto")
    }
//dddddds
    previousMessageCountRef.current = nextCount
  }, [messages.length])

  return (
    <div className="space-y-4 overflow-visible">
      {messages.map((message) => {
        const additionalOptions =
          typeof messageOptions === "function"
            ? messageOptions(message)
            : messageOptions

        return (
          <ChatMessage
            key={message.id}
            showTimeStamp={showTimeStamps}
            {...message}
            {...additionalOptions}
          />
        )
      })}
      <div ref={messagesEndRef} />
    </div>
  )
}
