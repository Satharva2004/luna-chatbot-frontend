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
      <div className="w-full max-w-[22rem] overflow-hidden rounded-3xl p-5 glass-morphism">
        <div className="flex flex-col gap-4">
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
              <div key={stage.key} className="flex items-center gap-4">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-500",
                  isComplete ? "bg-emerald-500/10 text-emerald-500" : isActive ? "bg-primary/10 text-primary animate-pulse" : "bg-muted text-muted-foreground/30"
                )}>
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between gap-3 overflow-hidden">
                  <span className={cn(
                    "font-semibold tracking-tight text-[13px] transition-colors duration-500",
                    isActive ? "text-foreground" : "text-muted-foreground/30"
                  )}>
                    {label}
                  </span>
                  {isActive && <PulsingSpark />}
                </div>
              </div>
            )
          })}

          <div className="space-y-3 mt-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={displayStage.key}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="flex flex-wrap items-center gap-2"
              >
                {activeHints.map((hint) => (
                  <span
                    key={`${displayStage.key}-${hint}`}
                    className="px-3 py-1 rounded-full bg-white/10 border border-white/5 text-[10px] font-bold text-primary/60 uppercase tracking-tighter dark:bg-white/5"
                  >
                    {hint}
                  </span>
                ))}
              </motion.div>
            </AnimatePresence>

            <div className="relative h-1 w-full overflow-hidden rounded-full bg-primary/5">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                initial={false}
                animate={{ width: `${Math.min(progress, 1) * 100}%` }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PulsingSpark() {
  return (
    <div className="relative h-2 w-12 overflow-hidden flex items-center justify-end">
      <motion.div
        className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
        animate={{
          opacity: [0.2, 1, 0.2],
          scale: [0.8, 1.2, 0.8],
          x: [-20, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  )
}
