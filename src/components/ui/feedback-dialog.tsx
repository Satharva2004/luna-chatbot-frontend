'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Image as ImageIcon, Loader2, MessageCircle, X } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type FeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId?: string | null
  userEmail?: string | null
  userId?: string | null
}

type FeedbackFormState = {
  title: string
  message: string
  email: string
  url: string
  image: string
}

const DEFAULT_FORM: FeedbackFormState = {
  title: "",
  message: "",
  email: "",
  url: "",
  image: "",
}

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024 // 6 MB

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, index)
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

export function FeedbackDialog({ open, onOpenChange, conversationId, userEmail, userId }: FeedbackDialogProps) {
  const [form, setForm] = useState<FeedbackFormState>(DEFAULT_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageMeta, setImageMeta] = useState<{ name: string; size: number } | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const apiEndpoint = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
    return base ? `${base}/api/feedback` : "/api/feedback"
  }, [])

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...DEFAULT_FORM,
        email: userEmail ?? prev.email ?? "",
        url: typeof window !== "undefined" ? window.location.href : prev.url,
        image: "",
      }))
      setImageMeta(null)
      setIsDragActive(false)
    }
  }, [open, userEmail])

  const updateField = useCallback(<K extends keyof FeedbackFormState>(key: K, value: FeedbackFormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.title.trim()) {
      toast.error("Feedback incomplete", {
        description: "Please add a short title so we know what this is about.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim() || undefined,
        email: form.email.trim() || undefined,
        url: form.url.trim() || undefined,
        image: form.image.trim() || undefined,
        conversationId: conversationId ?? undefined,
        userId: userId ?? undefined,
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error || "Failed to send feedback")
      }

      toast.success("Thank you!", {
        description: "Your feedback has been shared with the team.",
      })

      setForm(DEFAULT_FORM)
      onOpenChange(false)
    } catch (error) {
      console.error("Feedback submission failed", error)
      toast.error("Unable to send feedback", {
        description: error instanceof Error ? error.message : "Please try again shortly.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [apiEndpoint, conversationId, form, onOpenChange, userId])

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Unsupported file", {
        description: "Please attach an image (PNG, JPG, GIF).",
      })
      return
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image too large", {
        description: "Please keep screenshots under 6MB.",
      })
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })

    setForm((prev) => ({
      ...prev,
      image: dataUrl,
    }))
    setImageMeta({ name: file.name, size: file.size })
  }, [])

  const handleFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        await handleImageFile(file)
      }
      event.target.value = ""
    },
    [handleImageFile]
  )

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragActive(false)
      const file = event.dataTransfer.files?.[0]
      if (file) {
        await handleImageFile(file)
      }
    },
    [handleImageFile]
  )

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLDivElement>) => {
      const file = event.clipboardData.files?.[0]
      if (file) {
        event.preventDefault()
        await handleImageFile(file)
      }
    },
    [handleImageFile]
  )

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const clearImage = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      image: "",
    }))
    setImageMeta(null)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-h-[85vh] max-w-lg overflow-y-auto border border-border/70 bg-background/95 shadow-2xl backdrop-blur sm:w-full">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            Share feedback
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Tell us what felt great, what broke, or what you want next. We’ll attach your account email and the current page automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="feedback-title">
                Title
              </label>
              <Input
                id="feedback-title"
                placeholder="Quick summary"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="feedback-image">
                Screenshot <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <div
                id="feedback-image"
                role="button"
                tabIndex={0}
                onClick={handleBrowseClick}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    handleBrowseClick()
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  if (!isDragActive) setIsDragActive(true)
                }}
                onDragLeave={(event) => {
                  event.preventDefault()
                  setIsDragActive(false)
                }}
                onDrop={handleDrop}
                onPaste={handlePaste}
                className={cn(
                  "flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/40 px-4 text-center transition",
                  isDragActive && "border-primary bg-primary/10",
                  form.image && "border-solid border-primary/50 bg-primary/5"
                )}
              >
                {form.image ? (
                  <div className="flex w-full flex-col items-center gap-2">
                    <ImageIcon className="h-6 w-6 text-primary" />
                    <div className="text-sm font-medium">
                      {imageMeta?.name ?? "Screenshot added"}
                    </div>
                    {imageMeta?.size ? (
                      <p className="text-xs text-muted-foreground">{formatBytes(imageMeta.size)}</p>
                    ) : null}
                    <Button type="button" variant="ghost" size="sm" onClick={(event) => {
                      event.stopPropagation()
                      clearImage()
                    }}>
                      <X className="mr-1 h-4 w-4" /> Remove screenshot
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <div className="font-medium text-foreground">Drop, paste, or browse</div>
                    <p className="text-xs text-muted-foreground">Paste a screenshot, drag a file, or click to choose from your folders.</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or GIF up to {formatBytes(MAX_IMAGE_SIZE_BYTES)}. Larger files will be rejected.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="mb-2 text-sm font-medium" htmlFor="feedback-message">
              Details <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="feedback-message"
              placeholder="Tell us what happened…"
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              className="min-h-[50px]"
            />
            <p className="text-xs text-muted-foreground">
              Include steps to reproduce, links, or anything else that helps us understand.
            </p>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button type="submit" disabled={isSubmitting} className="rounded-full px-5">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
