"use client"

import React, { useMemo, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Ban, ChevronRight, Code2, Loader2, Terminal } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FilePreview } from "@/components/ui/file-preview"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

const chatBubbleVariants = cva(
  "group/message relative break-words rounded-lg p-3 text-sm",
  {
    variants: {
      isUser: {
        true: "bg-primary text-primary-foreground max-w-[85%] sm:max-w-[70%]",
        false: "bg-muted text-foreground max-w-[90%] sm:max-w-[80%]",
      },
      animation: {
        none: "",
        slide: "duration-300 animate-in fade-in-0",
        scale: "duration-300 animate-in fade-in-0 zoom-in-75",
        fade: "duration-500 animate-in fade-in-0",
      },
    },
    compoundVariants: [
      {
        isUser: true,
        animation: "slide",
        class: "slide-in-from-right",
      },
      {
        isUser: false,
        animation: "slide",
        class: "slide-in-from-left",
      },
      {
        isUser: true,
        animation: "scale",
        class: "origin-bottom-right",
      },
      {
        isUser: false,
        animation: "scale",
        class: "origin-bottom-left",
      },
    ],
  }
)

type Animation = VariantProps<typeof chatBubbleVariants>["animation"]

interface Attachment {
  name?: string
  contentType?: string
  url: string
}

interface PartialToolCall {
  state: "partial-call"
  toolName: string
}

interface ToolCall {
  state: "call"
  toolName: string
}

interface ToolResult {
  state: "result"
  toolName: string
  result: {
    __cancelled?: boolean
    [key: string]: unknown
  }
}

type ToolInvocation = PartialToolCall | ToolCall | ToolResult

interface ReasoningPart {
  type: "reasoning"
  reasoning: string
}

interface ToolInvocationPart {
  type: "tool-invocation"
  toolInvocation: ToolInvocation
}

interface TextPart {
  type: "text"
  text: string
}

interface SourcePart {
  type: "source"
  source?: unknown
}

interface FilePart {
  type: "file"
  mimeType: string
  data: string
}

interface StepStartPart {
  type: "step-start"
}

export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolInvocationPart
  | SourcePart
  | FilePart
  | StepStartPart

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
  experimental_attachments?: Attachment[]
  toolInvocations?: ToolInvocation[]
  parts?: MessagePart[]
  sources?: Array<string | { url: string; title?: string }>
  chartUrl?: string | null
}

export interface ChatMessageProps extends Message {
  showTimeStamp?: boolean
  animation?: Animation
  actions?: React.ReactNode
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  createdAt,
  chartUrl,
  showTimeStamp = false,
  animation = "scale",
  actions,
  experimental_attachments,
  toolInvocations,
  parts,
  sources,
}) => {
  const files = useMemo(() => {
    return experimental_attachments?.map((attachment) => {
      const dataArray = dataUrlToUint8Array(attachment.url)
      const file = new File([dataArray], attachment.name ?? "Unknown", {
        type: attachment.contentType,
      })
      return file
    })
  }, [experimental_attachments])

  const isUser = role === "user"
  const [isChartDownloading, setIsChartDownloading] = useState(false)

  const handleDownloadChart = async () => {
    if (!chartUrl) return

    try {
      setIsChartDownloading(true)
      const response = await fetch(chartUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch chart: ${response.status}`)
      }

      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = "chart.png"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (error) {
      console.error("Unable to download chart", error)
    } finally {
      setIsChartDownloading(false)
    }
  }
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('ChatMessage - Role:', role, 
      'Sources:', sources ? `Array(${sources.length})` : 'none', 
      'Content:', content ? `${content.substring(0, 50)}${content.length > 50 ? '...' : ''}` : 'empty'
    )
    
    if (sources && sources.length > 0) {
      console.log('Sources details:', JSON.stringify(sources, null, 2));
    }
  }

  const formattedTime = createdAt?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  // Render message with files if present
  const renderMessageContent = (content: string) => (
    <div className={cn("flex flex-col w-full relative", isUser ? "items-end" : "items-start")}>
      <div className={cn(chatBubbleVariants({ isUser, animation }), "relative")}>
        {files && (
          <div className="mb-1 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <FilePreview file={file} key={index} />
            ))}
          </div>
        )}
        <div className="overflow-hidden">
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </div>
        {chartUrl && (
          <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between bg-muted/50 px-3 py-2">
              <span className="text-sm font-medium text-muted-foreground">Generated chart</span>
              <button
                type="button"
                onClick={handleDownloadChart}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-60 disabled:pointer-events-none"
                disabled={isChartDownloading}
              >
                {isChartDownloading ? "Preparing..." : "Download"}
              </button>
            </div>
            <img 
              src={chartUrl} 
              alt="Generated chart" 
              className="w-full h-auto"
              onError={(e) => {
                // Handle image loading error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
        {sources && sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-muted-foreground/20 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground">SOURCES</span>
              <span className="text-xs bg-muted-foreground/10 text-muted-foreground rounded-full px-2 py-0.5">
                {sources.length}
              </span>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2 -mr-2 pl-1">
              {sources.map((source, index) => {
                if (!source) return null;
                
                try {
                  let href: string;
                  let displayText: string;
                  
                  if (typeof source === 'string') {
                    // Handle string source (URL)
                    href = source;
                    try {
                      const url = new URL(href);
                      displayText = url.hostname.replace('www.', '');
                    } catch (e) {
                      console.warn('Invalid URL in sources, showing as text:', source);
                      return (
                        <div key={index} className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                          Source: {source.substring(0, 100)}{source.length > 100 ? '...' : ''}
                        </div>
                      );
                    }
                  } else {
                    // Handle object source with url and optional title
                    href = source.url;
                    displayText = source.title || (() => {
                      try {
                        const url = new URL(href);
                        return url.hostname.replace('www.', '');
                      } catch {
                        return href;
                      }
                    })();
                  }
                  
                  return (
                    <a
                      key={index}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 p-2 mx-0 rounded-md text-xs hover:bg-muted-foreground/5 transition-colors border border-border/50"
                      title={displayText}
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        KhtmlUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        userSelect: 'none',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-blue-600 dark:text-blue-400 truncate">
                          {displayText}
                        </div>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  );
                } catch (e) {
                  console.warn('Error processing source:', source, e);
                  return null;
                }
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-4 h-6 pointer-events-none" />
          </div>
        )}
        
      </div>

      {showTimeStamp && createdAt && (
        <time
          dateTime={createdAt.toISOString()}
          className={cn(
            "mt-1 block px-1 text-xs opacity-50",
            animation !== "none" && "duration-500 animate-in fade-in-0"
          )}
        >
          {formattedTime}
        </time>
      )}
    </div>
  );

  if (isUser) {
    return renderMessageContent(content);
  }

  if (parts && parts.length > 0) {
    return parts.map((part, index) => {
      if (part.type === "text") {
        return (
          <div
            className={cn(
              "flex flex-col w-full",
              isUser ? "items-end" : "items-start"
            )}
            key={`text-${index}`}
          >
            <div className={cn(chatBubbleVariants({ isUser, animation }))}>
              <div className="overflow-hidden">
                <MarkdownRenderer>{part.text}</MarkdownRenderer>
              </div>
              {actions ? (
                <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
                  {actions}
                </div>
              ) : null}
            </div>

            {showTimeStamp && createdAt ? (
              <time
                dateTime={createdAt.toISOString()}
                className={cn(
                  "mt-1 block px-1 text-xs opacity-50",
                  animation !== "none" && "duration-500 animate-in fade-in-0"
                )}
              >
                {formattedTime}
              </time>
            ) : null}
          </div>
        )
      } else if (part.type === "reasoning") {
        return <ReasoningBlock key={`reasoning-${index}`} part={part} />
      } else if (part.type === "tool-invocation") {
        return (
          <ToolCall
            key={`tool-${index}`}
            toolInvocations={[part.toolInvocation]}
          />
        )
      }
      return null
    })
  }

  if (toolInvocations && toolInvocations.length > 0) {
    return <ToolCall toolInvocations={toolInvocations} />
  }

  // For assistant messages with content but no parts
  if (content) {
    return renderMessageContent(content);
  }
  
  // Fallback for any other case
  return (
    <div className={cn("flex flex-col w-full", isUser ? "items-end" : "items-start")}>
      <div className={cn(chatBubbleVariants({ isUser, animation }))}>
        <div className="overflow-hidden">
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </div>
        {actions && (
          <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
            {actions}
          </div>
        )}
      </div>

      {showTimeStamp && createdAt && (
        <time
          dateTime={createdAt.toISOString()}
          className={cn(
            "mt-1 block px-1 text-xs opacity-50",
            animation !== "none" && "duration-500 animate-in fade-in-0"
          )}
        >
          {formattedTime}
        </time>
      )}
    </div>
  )
}

function dataUrlToUint8Array(data: string) {
  const base64 = data.split(",")[1]
  const buf = Buffer.from(base64, "base64")
  return new Uint8Array(buf)
}

const ReasoningBlock = ({ part }: { part: ReasoningPart }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-2 flex flex-col items-start max-w-[90%] sm:max-w-[80%]">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="group w-full overflow-hidden rounded-lg border bg-muted/50"
      >
        <div className="flex items-center p-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
              <span>Thinking</span>
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent forceMount>
          <motion.div
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: { height: "auto", opacity: 1 },
              closed: { height: 0, opacity: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="border-t"
          >
            <div className="p-2">
              <div className="whitespace-pre-wrap text-xs overflow-hidden">
                {part.reasoning}
              </div>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function ToolCall({
  toolInvocations,
}: Pick<ChatMessageProps, "toolInvocations">) {
  if (!toolInvocations?.length) return null

  return (
    <div className="flex flex-col items-start gap-2 max-w-[90%] sm:max-w-[80%]">
      {toolInvocations.map((invocation, index) => {
        const isCancelled =
          invocation.state === "result" &&
          invocation.result.__cancelled === true

        if (isCancelled) {
          return (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
            >
              <Ban className="h-4 w-4" />
              <span>
                Cancelled{" "}
                <span className="font-mono">
                  {"`"}
                  {invocation.toolName}
                  {"`"}
                </span>
              </span>
            </div>
          )
        }

        switch (invocation.state) {
          case "partial-call":
          case "call":
            return (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              >
                <Terminal className="h-4 w-4" />
                <span>
                  Calling{" "}
                  <span className="font-mono">
                    {"`"}
                    {invocation.toolName}
                    {"`"}
                  </span>
                  ...
                </span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            )
          case "result":
            return (
              <div
                key={index}
                className="flex flex-col gap-1.5 rounded-lg border bg-muted/50 px-3 py-2 text-sm w-full"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Code2 className="h-4 w-4" />
                  <span>
                    Result from{" "}
                    <span className="font-mono">
                      {"`"}
                      {invocation.toolName}
                      {"`"}
                    </span>
                  </span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-foreground text-xs break-words">
                  {JSON.stringify(invocation.result, null, 2)}
                </pre>
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}