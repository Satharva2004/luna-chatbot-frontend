"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Ban, ChevronRight, Code2, Download, Loader2, Terminal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FilePreview } from "@/components/ui/file-preview"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

const chatBubbleVariants = cva(
  "group/message relative break-words text-sm transition-all duration-300",
  {
    variants: {
      isUser: {
        true: "max-w-[85%] sm:max-w-[70%] rounded-3xl px-4 py-3 text-slate-900 ring-1 ring-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,17,26,0.08)] hover:translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,17,26,0.12)] dark:bg-white/10 dark:text-slate-100 dark:ring-white/15",
        false: "w-full max-w-[95%] sm:max-w-[88%] px-1 py-1 text-slate-900 dark:text-slate-100",
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
  images?: ImageResult[] | null
  parts?: MessagePart[]
  sources?: Array<string | { url: string; title?: string }>
  chartUrl?: string | null
  chartUrls?: string[] | null
  videos?: Array<{
    videoId?: string
    title?: string
    description?: string
    channelTitle?: string
    url?: string
    thumbnails?: {
      default?: { url?: string }
      medium?: { url?: string }
      high?: { url?: string }
    }
  }> | null
  // Optional title for assistant responses, typically the user's prompt.
  promptTitle?: string
  isComplete?: boolean
}

export interface ImageResult {
  title: string | null
  imageUrl: string | null
  pageUrl: string | null
  thumbnailUrl?: string | null
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
  chartUrls,
  images,
  videos,
  showTimeStamp = false,
  animation = "scale",
  actions,
  experimental_attachments,
  toolInvocations,
  parts,
  sources,
  promptTitle,
  isComplete,
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
  const [downloadingChartUrl, setDownloadingChartUrl] = useState<string | null>(null)
  const [expandedChartUrl, setExpandedChartUrl] = useState<string | null>(null)
  const videoScrollRef = useRef<HTMLDivElement | null>(null)
  const imageScrollRef = useRef<HTMLDivElement | null>(null)
  const [canScrollImagesLeft, setCanScrollImagesLeft] = useState(false)
  const [canScrollImagesRight, setCanScrollImagesRight] = useState(false)

  const updateImageScrollButtons = useCallback(() => {
    if (!imageScrollRef.current) {
      setCanScrollImagesLeft(false)
      setCanScrollImagesRight(false)
      return
    }

    const el = imageScrollRef.current
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    const scrollLeft = el.scrollLeft
    const epsilon = 4

    setCanScrollImagesLeft(scrollLeft > epsilon)
    setCanScrollImagesRight(scrollLeft < maxScrollLeft - epsilon)
  }, [])

  useEffect(() => {
    updateImageScrollButtons()
  }, [images, updateImageScrollButtons])

  const resolvedChartUrls = useMemo(() => {
    const urls = [chartUrl, ...(Array.isArray(chartUrls) ? chartUrls : [])]
      .filter((url): url is string => typeof url === "string" && url.trim().length > 0)

    return Array.from(new Set(urls))
  }, [chartUrl, chartUrls])

  const handleDownloadChart = async (url: string) => {
    if (!url) return

    try {
      setDownloadingChartUrl(url)
      const response = await fetch(url)

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
      setDownloadingChartUrl(null)
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
  const renderMessageContent = (content: string, promptTitleOverride?: string) => (
    <div className={cn("flex flex-col w-full relative", isUser ? "items-end" : "items-start")}>
      <div className={cn(chatBubbleVariants({ isUser, animation }), "relative") }>
        {files && (
          <div className="mb-1 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <FilePreview file={file} key={index} />
            ))}
          </div>
        )}

        {!isUser && (promptTitleOverride || promptTitle) && (
          <div className="mb-6 text-3xl font-semibold tracking-tight text-foreground">
            {promptTitleOverride || promptTitle}
            <hr style={{width: "100%", marginTop: "20px" }}/>
          </div>
        )}

        {Array.isArray(images) && images.length > 0 && (
          <div className="mt-0 pt-0">
            <div className="relative -mx-3 pb-3">
              {images.length > 1 && canScrollImagesLeft && (
                <button
                  type="button"
                  className="absolute left-1 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 p-1 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/70"
                  onClick={() => {
                    if (imageScrollRef.current) {
                      imageScrollRef.current.scrollBy({ left: -260, behavior: 'smooth' })
                    }
                  }}
                  aria-label="Scroll images left"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
              )}
              {images.length > 1 && canScrollImagesRight && (
                <button
                  type="button"
                  className="absolute right-1 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 p-1 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/70"
                  onClick={() => {
                    if (imageScrollRef.current) {
                      imageScrollRef.current.scrollBy({ left: 260, behavior: 'smooth' })
                    }
                  }}
                  aria-label="Scroll images right"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              )}
              <div
                ref={imageScrollRef}
                onScroll={updateImageScrollButtons}
                className="web-images-scroll flex min-w-[280px] gap-3 px-3 overflow-x-auto"
                style={{
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {images
                  .filter((img) => typeof img?.imageUrl === 'string' && img.imageUrl)
                  .map((img, index) => {
                    const targetHref = typeof img?.pageUrl === 'string' && img.pageUrl?.trim().length > 0
                      ? img.pageUrl
                      : img.imageUrl;
                    const caption = (typeof img?.title === 'string' && img.title?.trim().length > 0)
                      ? img.title
                      : 'View image';

                    return (
                      <a
                        key={`${img.imageUrl}-${index}`}
                        href={targetHref ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex w-[240px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_16px_40px_rgba(15,17,26,0.16)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,17,26,0.38)] dark:border-white/10 dark:bg-[#101015] dark:shadow-[0_22px_60px_rgba(0,0,0,0.75)]"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                          <img
                            src={img.imageUrl || ''}
                            alt={caption}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                            loading="lazy"
                            onError={(event) => {
                              const el = event.target as HTMLImageElement;
                              el.src = img.thumbnailUrl || '';
                            }}
                          />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-6 text-xs text-white transition-transform duration-200 group-hover:translate-y-0">
                            <div className="line-clamp-2 font-medium leading-snug">
                              {caption}
                            </div>
                            {targetHref && (
                              <div className="mt-1 text-[11px] text-white/80 truncate">
                                {(() => {
                                  try {
                                    const url = new URL(targetHref);
                                    return url.hostname.replace(/^www\./, '');
                                  } catch {
                                    return targetHref;
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        <div
          className="overflow-hidden"
          style={{
            fontFamily: '"Inter", "Nunito", "Helvetica Neue", Arial, sans-serif',
            fontWeight: 400,
            lineHeight: 2,
            fontSize: '0.9rem',
          }}
          >
          <MarkdownRenderer>
            {content}
          </MarkdownRenderer>
        </div>
        {Array.isArray(videos) && videos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-muted-foreground/20">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">YOUTUBE RECOMMENDATIONS</span>
                <span className="text-xs bg-muted-foreground/10 text-muted-foreground rounded-full px-2 py-0.5">
                  {videos.length}
                </span>
              </div>
              <div className="hidden items-center gap-2 text-[11px] text-muted-foreground/70 md:flex">
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    if (videoScrollRef.current) {
                      videoScrollRef.current.scrollBy({ left: -280, behavior: 'smooth' })
                    }
                  }}
                  aria-label="Scroll left"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <span>Powered by YouTube search</span>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    if (videoScrollRef.current) {
                      videoScrollRef.current.scrollBy({ left: 280, behavior: 'smooth' })
                    }
                  }}
                  aria-label="Scroll right"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="relative -mx-3 pb-3 md:mx-0">
              <div
                ref={videoScrollRef}
                className="flex gap-3 px-3 overflow-x-auto pt-2 pb-1 md:px-0 md:pt-2 md:pb-0"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.25) transparent',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {videos
                  .filter((video) => typeof (video?.url || video?.videoId) === 'string')
                  .map((video, index) => {
                    const extractVideoId = (url?: string) => {
                      if (!url) return undefined;
                      try {
                        const parsed = new URL(url);
                        if (parsed.hostname.includes('youtu.be')) {
                          return parsed.pathname.replace('/', '').trim();
                        }
                        if (parsed.searchParams.has('v')) {
                          return parsed.searchParams.get('v')?.trim() || undefined;
                        }
                        const match = parsed.pathname.split('/').filter(Boolean);
                        if (match[0] === 'embed' && match[1]) {
                          return match[1];
                        }
                      } catch (error) {
                        const regex = /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)/;
                        const result = regex.exec(url);
                        if (result && result[1]) {
                          return result[1];
                        }
                      }
                      return undefined;
                    };

                    const derivedVideoId = (typeof video?.videoId === 'string' && video.videoId.trim().length > 0)
                      ? video.videoId.trim()
                      : extractVideoId(video?.url);

                    const targetHref = (() => {
                      if (typeof video?.url === 'string' && video.url.trim().length > 0) {
                        return video.url;
                      }
                      if (derivedVideoId) {
                        return `https://www.youtube.com/watch?v=${derivedVideoId}`;
                      }
                      return undefined;
                    })();

                    const thumbnailUrl = video?.thumbnails?.medium?.url
                      || video?.thumbnails?.high?.url
                      || video?.thumbnails?.default?.url
                      || (derivedVideoId ? `https://img.youtube.com/vi/${derivedVideoId}/hqdefault.jpg` : undefined);

                    const title = (typeof video?.title === 'string' && video.title.trim().length > 0)
                      ? video.title
                      : 'Watch on YouTube';

                    const channel = (typeof video?.channelTitle === 'string' && video.channelTitle.trim().length > 0)
                      ? video.channelTitle
                      : undefined;

                    return (
                      <a
                        key={`${video?.videoId || video?.url || index}`}
                        href={targetHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/video relative flex w-[260px] flex-shrink-0 flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#161616] transition-transform hover:-translate-y-0.5 hover:border-white/20"
                      >
                        <div className="relative aspect-video w-full bg-black">
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(event) => {
                                const el = event.target as HTMLImageElement;
                                el.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                              Video unavailable
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/70 via-black/25 to-transparent opacity-0 transition-opacity duration-200 group-hover/video:opacity-60" />
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur group-hover/video:bg-white/25">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="h-6 w-6 text-white"
                                fill="currentColor"
                              >
                                <path d="M10 15.5v-7l6 3.5-6 3.5Z" />
                              </svg>
                            </span>
                          </div>
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-3 pt-6 opacity-0 transition-opacity duration-200 group-hover/video:opacity-100">
                            <p className="text-sm font-medium leading-tight text-white line-clamp-2">
                              {title}
                            </p>
                            {channel && (
                              <span className="mt-1 text-xs text-white/70">
                                {channel}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2 text-[11px] text-white/70">
                          <span className="line-clamp-1">youtube.com</span>
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors group-hover/video:bg-white/20 group-hover/video:text-white">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                            >
                              <path d="M7 17L17 7" />
                              <path d="M7 7h10v10" />
                            </svg>
                          </span>
                        </div>
                      </a>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
        {resolvedChartUrls.length > 0 && (
          <>
            <div className="mt-4 pt-3 border-t border-muted-foreground/20 relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">CHARTS</span>
                <span className="text-xs bg-muted-foreground/10 text-muted-foreground rounded-full px-2 py-0.5">
                  {resolvedChartUrls.length}
                </span>
              </div>
              <div className="space-y-3">
                {resolvedChartUrls.map((url, index) => {
                  const isDownloading = downloadingChartUrl === url
                  const chartLabel = resolvedChartUrls.length > 1 ? `Chart ${index + 1}` : "Generated chart"
                  return (
                    <div
                      key={`${url}-${index}`}
                      className="space-y-5 md:mx-auto md:max-w-2xl"
                    >
                      <div className="flex flex-col gap-2 px-2 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:px-0">
                        <span className="text-sm font-medium text-muted-foreground">{chartLabel}</span>
                        <Button
                          type="button"
                          onClick={() => handleDownloadChart(url)}
                          variant="secondary"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/40 bg-background/80 text-muted-foreground shadow-sm transition hover:bg-background sm:w-auto"
                          disabled={isDownloading}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Preparing...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Download chart
                            </>
                          )}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedChartUrl(url)}
                        className="relative block w-full group focus:outline-none"
                        aria-label={`Expand ${chartLabel}`}
                      >
                        <img
                          src={url}
                          alt={chartLabel}
                          className="w-full h-auto cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.02] group-focus-visible:scale-[1.02] md:mx-auto md:max-h-[360px] md:w-auto"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                          }}
                        />
                        <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
                          Tap to expand
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            <Dialog
              open={Boolean(expandedChartUrl)}
              onOpenChange={(open) => {
                if (!open) setExpandedChartUrl(null)
              }}
            >
              <DialogContent className="w-full max-w-6xl gap-4 p-0 sm:p-6">
                <DialogHeader className="flex flex-row items-center justify-between gap-4">
                  <DialogTitle className="text-base sm:text-lg">Generated chart</DialogTitle>
                  <Button
                    type="button"
                    onClick={() => expandedChartUrl && handleDownloadChart(expandedChartUrl)}
                    variant="secondary"
                    className="hidden sm:inline-flex items-center gap-2"
                    disabled={Boolean(expandedChartUrl && downloadingChartUrl === expandedChartUrl)}
                  >
                    {expandedChartUrl && downloadingChartUrl === expandedChartUrl ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download
                      </>
                    )}
                  </Button>
                </DialogHeader>
                <div className="flex flex-col gap-4 px-4 pb-6 sm:px-0">
                  <div className="overflow-auto">
                    {expandedChartUrl && (
                      <img
                        src={expandedChartUrl}
                        alt="Expanded chart"
                        className="mx-auto h-auto max-h-[80vh] w-full max-w-[1100px] object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                        }}
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => expandedChartUrl && handleDownloadChart(expandedChartUrl)}
                    variant="secondary"
                    className="sm:hidden w-full justify-center gap-2"
                    disabled={Boolean(expandedChartUrl && downloadingChartUrl === expandedChartUrl)}
                  >
                    {expandedChartUrl && downloadingChartUrl === expandedChartUrl ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download chart
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
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
      {actions && (isComplete === undefined || isComplete) && (
        <div
          className={cn(
            "mt-3 flex space-x-1 rounded-lg border bg-background/95 p-1 text-foreground shadow-sm",
            isUser ? "self-end" : "self-start"
          )}
        >
          {actions}
        </div>
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
            {actions ? (
              <div
                className={cn(
                  "mt-3 flex space-x-1 rounded-lg border bg-background/95 p-1 text-foreground shadow-sm",
                  isUser ? "self-end" : "self-start"
                )}
              >
                {actions}
              </div>
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
      {actions && (
        <div
          className={cn(
            "mt-3 flex space-x-1 rounded-lg border bg-background/95 p-1 text-foreground shadow-sm",
            isUser ? "self-end" : "self-start"
          )}
        >
          {actions}
        </div>
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