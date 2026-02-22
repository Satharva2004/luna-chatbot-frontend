import { BarChart3, Check, Search, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
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
  title: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}> = [
    {
      key: "searching",
      title: "Searching the web",
      description: "",
      icon: Search,
    },
    {
      key: "responding",
      title: "Generating insights",
      description: "",
      icon: Sparkles,
    },
    {
      key: "charting",
      title: "Preparing charts",
      description: "Visualizing key findings",
      icon: BarChart3,
    },
  ]

const DEFAULT_SOURCE_HINTS: Record<AssistantStage, string[]> = {
  searching: ["Google", "Bing", "Reuters"],
  responding: ["Google", "Bing", "Reuters"],
  charting: ["Data shaping", "Visual draft", "Refining axes"],
}

export function TypingIndicator({ statuses, stageDetails, sourceHints }: TypingIndicatorProps) {
  const mergedStatuses: AssistantStatusMap = {
    ...createInitialAssistantStatuses(),
    ...(statuses ?? {}),
  }

  const activeStage = STAGE_CONFIG.find(({ key }) => mergedStatuses[key] === "active")
  const firstIncompleteIndex = STAGE_CONFIG.findIndex(({ key }) => mergedStatuses[key] !== "complete")
  const fallbackStage =
    firstIncompleteIndex !== -1
      ? STAGE_CONFIG[firstIncompleteIndex]
      : STAGE_CONFIG[STAGE_CONFIG.length - 1]

  const displayStage = activeStage ?? fallbackStage
  const displayState = mergedStatuses[displayStage.key]

  const completedCount = STAGE_CONFIG.filter(({ key }) => mergedStatuses[key] === "complete").length
  const progress = Math.max(0.05, (completedCount + (displayState === "active" ? 0.35 : 0)) / STAGE_CONFIG.length)
  const activeHints = sourceHints?.[displayStage.key] ?? DEFAULT_SOURCE_HINTS[displayStage.key]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex justify-start text-xs"
    >
      <div className="w-full max-w-[20rem] overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-background/90 via-background/95 to-primary/5 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-md dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-3">
          {STAGE_CONFIG.map((stage) => {
            const state = mergedStatuses[stage.key]
            const Icon = stage.icon
            const isActive = state === "active"
            const isComplete = state === "complete"

            const label =
              stage.key === "searching"
                ? "Searching Deep Web"
                : stage.key === "responding"
                  ? "Reasoning & Analyzing"
                  : "Visualizing Insights"

            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300",
                  isComplete ? "bg-emerald-500/10 text-emerald-500" : isActive ? "bg-primary/20 text-primary animate-pulse" : "bg-muted text-muted-foreground/50"
                )}>
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className={cn("h-3.5 w-3.5", isActive && "animate-spin-slow")} />
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                  <span className={cn(
                    "font-medium tracking-tight",
                    isActive ? "text-foreground" : "text-muted-foreground/70"
                  )}>
                    {label}
                  </span>
                  {isActive && <AnimatedDots />}
                </div>
              </div>
            )
          })}

          <div className="space-y-2 mt-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={displayStage.key}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                className="flex flex-wrap items-center gap-1.5"
              >
                {activeHints.map((hint) => (
                  <span
                    key={`${displayStage.key}-${hint}`}
                    className="px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-[9px] font-medium text-primary/70 uppercase tracking-widest whitespace-nowrap"
                  >
                    {hint}
                  </span>
                ))}
              </motion.div>
            </AnimatePresence>

            <div className="relative h-1 w-full overflow-hidden rounded-full bg-primary/5">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/60 to-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                initial={false}
                animate={{ width: `${Math.min(progress, 1) * 100}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function AnimatedDots() {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-primary/70"
          animate={{ opacity: [0.4, 1, 0.4], y: [0, -1.5, 0] }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
