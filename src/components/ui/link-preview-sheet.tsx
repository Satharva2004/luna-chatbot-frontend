"use client"

import { ExternalLink, Globe, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface LinkPreviewSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string | null
  title?: string | null
}

export function LinkPreviewSheet({ open, onOpenChange, url, title }: LinkPreviewSheetProps) {
  const hostname = (() => {
    if (!url) return ""
    try {
      return new URL(url).hostname.replace(/^www\./, "")
    } catch {
      return url
    }
  })()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 border-l border-border/60 bg-background/95 p-0 sm:max-w-3xl">
        <SheetHeader className="gap-3 border-b border-border/60 bg-background/90 px-5 py-4 text-left backdrop-blur">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <SheetTitle className="truncate text-base font-semibold">
                {title?.trim() || hostname || "Link preview"}
              </SheetTitle>
              <SheetDescription className="mt-1 truncate text-xs">
                {url || "No URL selected"}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => {
                  if (!url) return
                  window.open(url, "_blank", "noopener,noreferrer")
                }}
                disabled={!url}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {url ? (
            <>
              <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-5 py-2 text-xs text-muted-foreground">
                <div className="flex min-w-0 items-center gap-2 truncate">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{hostname}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    const frame = document.getElementById("chat-link-preview-frame") as HTMLIFrameElement | null
                    frame?.contentWindow?.location.reload()
                  }}
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                </Button>
              </div>

              <iframe
                id="chat-link-preview-frame"
                src={url}
                title={title?.trim() || hostname || "Link preview"}
                className="min-h-0 flex-1 bg-white"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
                referrerPolicy="no-referrer"
              />

              <div className="border-t border-border/50 bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
                Some websites may block embedded previews. Use the Open button if the page stays blank.
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-sm text-muted-foreground">
              Select a source to preview it here.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
