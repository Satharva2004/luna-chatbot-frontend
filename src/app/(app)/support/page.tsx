"use client"

import * as React from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FeedbackDialog } from "@/components/ui/feedback-dialog"
import { useAuth } from "@/contexts/auth-context"
import {
  ChevronDownIcon,
  MessageSquareIcon,
  BookOpenIcon,
  MessageCircleQuestionIcon,
} from "lucide-react"

const FAQ = [
  {
    q: "How do I start a new conversation?",
    a: "Open Chat from the sidebar and start typing, or press Cmd+K and choose New chat. Each conversation is saved automatically and appears under History.",
  },
  {
    q: "Which model should I pick?",
    a: "Fast is best for quick lookups, Smart balances speed and reasoning, and Best gives the deepest answers at the cost of latency. Set a default in Settings, or switch per message from the chat composer.",
  },
  {
    q: "What do the YouTube and image toggles do?",
    a: "They let Luna pull supporting videos and images from the web into an answer. Both are off by default and can be changed in Settings or directly in the composer.",
  },
  {
    q: "Can I delete a conversation?",
    a: "Yes. Go to History, hover the row you want to remove, and use the trash icon. Deleting is permanent.",
  },
  {
    q: "How is my Engagement Score calculated?",
    a: "It averages three sub-scores: conversation depth (messages per chat), weekly cadence (new chats this week), and library size (total threads saved).",
  },
]

const SHORTCUTS = [
  { keys: "Cmd K", label: "Open the command palette" },
  { keys: "Cmd B", label: "Toggle the sidebar" },
  { keys: "Enter", label: "Send a message" },
  { keys: "Esc", label: "Dismiss suggestions" },
]

export default function SupportPage() {
  const { user } = useAuth()
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0 md:gap-6 md:p-6 md:pt-0">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Help &amp; Support
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answers to the questions we get most, and a direct line to us.
        </p>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <MessageCircleQuestionIcon className="size-4 text-muted-foreground" />
              Frequently Asked
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {FAQ.map((item) => (
              <Collapsible key={item.q}>
                <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/50">
                  <span className="text-sm font-medium">{item.q}</span>
                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-2 pb-3 text-sm text-muted-foreground">
                  {item.a}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Contact us
              </CardTitle>
              <CardDescription>
                Tell us what broke or what you would like to see.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full gap-2"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquareIcon className="size-4" />
                Send feedback
              </Button>
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link href="/chat">
                  <BookOpenIcon className="size-4" />
                  Ask Luna
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Keyboard shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SHORTCUTS.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-muted-foreground">{s.label}</span>
                  <kbd className="pointer-events-none flex h-6 shrink-0 select-none items-center rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        conversationId={null}
        userEmail={user?.email ?? null}
        userId={user?.email ?? null}
      />
    </div>
  )
}
