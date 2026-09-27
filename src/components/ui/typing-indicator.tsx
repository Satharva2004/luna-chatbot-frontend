"use client"

import { BarChart3, Check, Search, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export type AssistantStage = "searching" | "responding" | "charting"
export type AssistantStageState = "pending" | "active" | "complete"
export type AssistantStatusMap = Record<AssistantStage, AssistantStageState>

export const createInitialAssistantStatuses = (): AssistantStatusMap => ({
  searching: "pending",
  responding: "pending",
  charting: "pending",
})

interface TypingIndicatorProps {
  statuses?: Partial<AssistantStatusMap>
  stageDetails?: Partial<Record<AssistantStage, string>>
  sourceHints?: Partial<Record<AssistantStage, string[]>>
}

const STAGE_CONFIG: Array<{
  key: AssistantStage
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}> = [
  { key: "searching", label: "Searching sources", icon: Search },
  { key: "responding", label: "Reasoning", icon: Sparkles },
  { key: "charting", label: "Preparing visuals", icon: BarChart3 },
]

/**
 * Inline progress for an in-flight assistant turn. Reads as one quiet line of
 * status rather than a panel, so it sits naturally in the message column.
 */
export function TypingIndicator({ statuses, stageDetails }: TypingIndicatorProps) {
  const merged: AssistantStatusMap = {
    ...createInitialAssistantStatuses(),
    ...(statuses ?? {}),
  }

  const activeIndex = STAGE_CONFIG.findIndex(({ key }) => merged[key] === "active")
  const firstIncomplete = STAGE_CONFIG.findIndex(({ key }) => merged[key] !== "complete")
  const currentIndex =
    activeIndex !== -1
      ? activeIndex
      : firstIncomplete !== -1
        ? firstIncomplete
        : STAGE_CONFIG.length - 1

  const current = STAGE_CONFIG[currentIndex]
  const detail = stageDetails?.[current.key]

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-2 py-1"
    >
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="relative flex size-4 items-center justify-center">
          <span className="absolute inline-flex size-4 animate-ping rounded-full bg-foreground/15" />
          <span className="relative inline-flex size-1.5 rounded-full bg-foreground/60" />
        </span>
        <span className="font-medium text-foreground/80">{current.label}</span>
        {detail && <span className="truncate text-xs">{detail}</span>}
      </div>

      <div className="flex items-center gap-1.5 pl-6.5">
        {STAGE_CONFIG.map((stage, i) => {
          const state = merged[stage.key]
          const isComplete = state === "complete" || i < currentIndex
          const isCurrent = i === currentIndex
          const Icon = stage.icon

          return (
            <span
              key={stage.key}
              title={stage.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                isComplete
                  ? "border-transparent bg-muted text-muted-foreground"
                  : isCurrent
                    ? "border-foreground/20 text-foreground"
                    : "border-transparent text-muted-foreground/40"
              )}
            >
              {isComplete ? (
                <Check className="size-2.5" />
              ) : (
                <Icon className={cn("size-2.5", isCurrent && "animate-pulse")} />
              )}
              {stage.label}
            </span>
          )
        })}
      </div>
    </motion.div>
  )
}
