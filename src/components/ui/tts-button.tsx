"use client"

import { useState, useEffect } from "react"
import { Volume2, Square } from "lucide-react"
import { Button } from "@/components/ui/button"

type TTSButtonProps = {
    content: string
}

function stripMarkdown(md: string): string {
    if (!md) return ""
    // Basic markdown stripping
    return md
        // Headers
        .replace(/^#+\s+/gm, "")
        // Bold/Italic
        .replace(/(\*\*|__)(.*?)\1/g, "$2")
        .replace(/(\*|_)(.*?)\1/g, "$2")
        // Links [text](url) -> text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        // Code blocks are tricky, maybe just read them? Or strip backticks?
        .replace(/```[\s\S]*?```/g, "Code block")
        .replace(/`([^`]+)`/g, "$1")
        // Blockquotes
        .replace(/^>\s+/gm, "")
        // Lists
        .replace(/^[\*\-\+]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        // Images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "Image")
        .trim()
}

export function TTSButton({ content }: TTSButtonProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null)

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            window.speechSynthesis.cancel()
        }
    }, [])

    const handlePlay = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel()
            setIsPlaying(false)
            return
        }

        const textToSpeak = stripMarkdown(content)

        // Chunk text if it's too long (over 1000 chars is risky in some browsers)
        // For now, let's just try to speak the whole thing but handle errors better.
        // If we need chunking, we can add it later.

        const newUtterance = new SpeechSynthesisUtterance(textToSpeak)

        // Attempt to set a good voice
        const voices = window.speechSynthesis.getVoices()
        const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Microsoft Zira")) || voices[0]
        if (preferredVoice) {
            newUtterance.voice = preferredVoice
        }

        newUtterance.onstart = () => {
            setIsPlaying(true)
        }

        newUtterance.onend = () => {
            setIsPlaying(false)
            setUtterance(null)
        }

        newUtterance.onerror = (e) => {
            // 'interrupted' or 'canceled' are not real errors usually
            if (e.error === 'interrupted' || e.error === 'canceled') {
                setIsPlaying(false)
                setUtterance(null)
                return
            }
            console.error("TTS Error Event:", e)
            console.error("TTS Error Type:", e.error)
            setIsPlaying(false)
            setUtterance(null)
        }

        setUtterance(newUtterance)
        window.speechSynthesis.speak(newUtterance)
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            aria-label={isPlaying ? "Stop text to speech" : "Read aloud"}
            onClick={handlePlay}
            title={isPlaying ? "Stop reading" : "Read aloud"}
        >
            {isPlaying ? (
                <Square className="h-4 w-4" />
            ) : (
                <Volume2 className="h-4 w-4" />
            )}
        </Button>
    )
}
