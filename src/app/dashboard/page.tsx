"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { MessageCircle, BarChart2, Calendar, TrendingUp, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Stats {
  totalConversations: number
  weekConversations: number
  totalMessages: number
  weekMessages: number
}

export default function DashboardPage() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { router.replace('/login'); return }
    fetch('/api/proxy/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, router])

  const displayName = user?.username || user?.name || 'there'

  const cards = stats ? [
    { label: "Total Conversations", value: stats.totalConversations, icon: <MessageCircle className="h-5 w-5 text-foreground" /> },
    { label: "Total Messages", value: stats.totalMessages, icon: <BarChart2 className="h-5 w-5 text-foreground" /> },
    { label: "Chats This Week", value: stats.weekConversations, icon: <Calendar className="h-5 w-5 text-foreground" /> },
    { label: "Messages This Week", value: stats.weekMessages, icon: <TrendingUp className="h-5 w-5 text-foreground" /> },
  ] : []

  const weeklyShare = stats && stats.totalConversations > 0
    ? Math.min(100, Math.round((stats.weekConversations / stats.totalConversations) * 100))
    : 0

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/chat')} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Your Stats</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hey {displayName}, here&apos;s a summary of your Luna usage.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/50 bg-secondary/30" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map(card => (
              <div key={card.label} className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  {card.icon}
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{card.value.toLocaleString()}</p>
                  <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Could not load stats.</p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-secondary/20 p-6">
            <p className="text-sm font-medium text-foreground">Messages per conversation</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {stats && stats.totalConversations > 0
                ? (stats.totalMessages / stats.totalConversations).toFixed(1)
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Average messages across all your conversations</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-secondary/20 p-6">
            <p className="text-sm font-medium text-foreground">This week's share</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{weeklyShare}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Of all conversations started this week</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${weeklyShare}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
