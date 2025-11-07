'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, MessageCircle } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/lib/hooks/use-toast"

const FEEDBACK_CATEGORIES = [
  { value: "ui", label: "UI / Design" },
  { value: "functionality", label: "Functionality" },
  { value: "bug", label: "Error / Bug" },
  { value: "feedback", label: "General Feedback" },
]

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
  category: string
  email: string
  url: string
}

const DEFAULT_FORM: FeedbackFormState = {
  title: "",
  message: "",
  category: FEEDBACK_CATEGORIES[0]?.value ?? "feedback",
  email: "",
  url: "",
}

export function FeedbackDialog({ open, onOpenChange, conversationId, userEmail, userId }: FeedbackDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<FeedbackFormState>(DEFAULT_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      }))
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

    if (!form.title.trim() || !form.message.trim()) {
      toast({
        variant: "destructive",
        title: "Feedback incomplete",
        description: "Please add a short title and describe your feedback.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        category: form.category,
        email: form.email.trim() || undefined,
        url: form.url.trim() || undefined,
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

      toast({
        title: "Thank you!",
        description: "Your feedback has been shared with the team.",
      })

      setForm(DEFAULT_FORM)
      onOpenChange(false)
    } catch (error) {
      console.error("Feedback submission failed", error)
      toast({
        variant: "destructive",
        title: "Unable to send feedback",
        description: error instanceof Error ? error.message : "Please try again shortly.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [apiEndpoint, conversationId, form, onOpenChange, toast, userId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0f66ff]/15 text-[#0f66ff] dark:bg-[#316cff]/15 dark:text-[#82aaff]">
              <MessageCircle className="h-5 w-5" />
            </span>
            Share feedback
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            We read every note. Tell us what felt great, what broke, or what you would improve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="feedback-title">
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
            <label className="text-sm font-medium text-foreground" htmlFor="feedback-category">
              Category
            </label>
            <Select
              value={form.category}
              onValueChange={(value) => updateField("category", value)}
            >
              <SelectTrigger id="feedback-category" className="justify-between">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="feedback-message">
              Details
            </label>
            <Textarea
              id="feedback-message"
              placeholder="Tell us what happened…"
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              className="min-h-[140px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              Include steps to reproduce, URLs, or anything else that helps us understand.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="feedback-email">
                Contact email <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="feedback-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="feedback-url">
                Page URL
              </label>
              <Input
                id="feedback-url"
                placeholder="https://"
                value={form.url}
                onChange={(event) => updateField("url", event.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <p className="text-xs text-muted-foreground">
              We never share your feedback outside the product team.
            </p>
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
