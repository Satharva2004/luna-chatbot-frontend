"use client"

import React from "react"
import { ExternalLink, Globe, RefreshCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"

interface LinkPreviewPaneProps {
  open: boolean
  url: string | null
  title?: string | null
  topOffset: number
  bottomOffset: number
  width?: number
  onClose: () => void
}

export function LinkPreviewPane({
  open,
  url,
  title,
  topOffset,
  bottomOffset,
  width = 460,
  onClose,
}: LinkPreviewPaneProps) {
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(url)
  const [previewSrc, setPreviewSrc] = React.useState<string | null>(null)
  const [isResolving, setIsResolving] = React.useState(false)
  const [resolveError, setResolveError] = React.useState<string | null>(null)
  const [frameKey, setFrameKey] = React.useState(0)

  React.useEffect(() => {
    if (!open || !url) {
      setResolvedUrl(url)
      setPreviewSrc(null)
      setResolveError(null)
      return
    }

    let cancelled = false

    async function resolveUrl() {
      try {
        setIsResolving(true)
        setResolveError(null)

        const response = await fetch(`/api/preview/resolve?url=${encodeURIComponent(url)}`)
        const data = await response.json()

        if (cancelled) return

        const nextResolvedUrl =
          typeof data?.resolvedUrl === "string" && data.resolvedUrl.trim().length > 0
            ? data.resolvedUrl
            : url

        setResolvedUrl(nextResolvedUrl)
        setPreviewSrc(`/api/preview/page?url=${encodeURIComponent(nextResolvedUrl)}`)
        setFrameKey((value) => value + 1)
      } catch (error) {
        if (cancelled) return
        setResolvedUrl(url)
        setPreviewSrc(`/api/preview/page?url=${encodeURIComponent(url)}`)
        setResolveError(error instanceof Error ? error.message : "Failed to resolve preview URL")
      } finally {
        if (!cancelled) {
          setIsResolving(false)
        }
      }
    }

    void resolveUrl()

    return () => {
      cancelled = true
    }
  }, [open, url])

  const hostname = React.useMemo(() => {
    const activeUrl = resolvedUrl || url
    if (!activeUrl) return ""

    try {
      return new URL(activeUrl).hostname.replace(/^www\./, "")
    } catch {
      return activeUrl
    }
  }, [resolvedUrl, url])

  if (!open || !url) return null

  return (
    <aside
      className="fixed right-0 z-20 hidden border-l border-border/60 bg-background/95 shadow-[-18px_0_40px_rgba(0,0,0,0.16)] backdrop-blur xl:block"
      style={{
        top: topOffset,
        bottom: bottomOffset,
        width,
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border/60 bg-background/90 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">
                {title?.trim() || hostname || "Link preview"}
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {resolvedUrl || url}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
            onClick={() => {
              const target = resolvedUrl || url
              if (!target) return
              window.open(target, "_blank", "noopener,noreferrer")
            }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-5 py-2 text-xs text-muted-foreground">
          <div className="flex min-w-0 items-center gap-2 truncate">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{hostname || "Resolving preview..."}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setFrameKey((value) => value + 1)}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="relative min-h-0 flex-1 bg-white">
          {(isResolving || resolveError) && (
            <div className="absolute inset-x-0 top-0 z-10 border-b border-border/50 bg-background/95 px-4 py-2 text-xs text-muted-foreground">
              {isResolving
                ? "Resolving source link..."
                : `Preview may be limited. ${resolveError}`}
            </div>
          )}
          <iframe
            key={frameKey}
            src={previewSrc || `/api/preview/page?url=${encodeURIComponent(resolvedUrl || url)}`}
            title={title?.trim() || hostname || "Link preview"}
            className="h-full w-full bg-white"
            sandbox="allow-same-origin allow-forms allow-popups allow-downloads"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="border-t border-border/50 bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
          The chat resizes around this panel now. If a site still blocks embedding, use Open.
        </div>
      </div>
    </aside>
  )
}
