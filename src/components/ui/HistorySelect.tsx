"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ChevronDown } from "lucide-react"
import { Button } from "./button"

interface Conversation {
  id: string
  title: string
  createdAt: string
}

export function HistorySelect({ currentId }: { currentId?: string }) {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch("/api/proxy/conversations")
        if (!response.ok) throw new Error("Failed to fetch conversations")
        const data = await response.json()
        const sortedConversations = data.sort(
          (a: Conversation, b: Conversation) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setConversations(sortedConversations)
      } catch (error) {
        console.error("Error fetching conversations:", error)
      }
    }

    fetchConversations()
  }, [])

  const handleSelect = (id: string | null) => {
    setIsOpen(false)
    if (id) {
      router.push(`/chat/${id}`)
    } else {
      router.push("/chat")
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, h:mm a")
    } catch {
      return ""
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        className="h-10 gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>History</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border bg-white dark:bg-gray-800 shadow-lg">
          <div className="max-h-80 overflow-auto">
            <button
              onClick={() => handleSelect(null)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <span>➕</span>
              <span>New Chat</span>
            </button>
            
            {conversations.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelect(conversation.id)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    currentId === conversation.id 
                      ? "bg-gray-100 dark:bg-gray-700 font-medium" 
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate">
                      {conversation.title || `Chat ${conversation.id.slice(0, 6)}`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                      {formatDate(conversation.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}