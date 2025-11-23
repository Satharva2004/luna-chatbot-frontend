import { BarChart3, Check, Search, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

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
    <div className="flex justify-start text-xs font-mono">
      <div className="w-full max-w-[20rem] rounded-lg border border-border/70 bg-background/95 px-3 py-2 shadow-[0_6px_20px_-18px_rgba(15,23,42,0.5)]">
        <div className="flex flex-col gap-1.5">
          {STAGE_CONFIG.map((stage) => {
            const state = mergedStatuses[stage.key]
            const Icon = stage.icon
            const isActive = state === "active"
            const isComplete = state === "complete"

            const label =
              stage.key === "searching"
                ? "Searching web"
                : stage.key === "responding"
                ? "Generating answer"
                : "Preparing charts"

            return (
              <div key={stage.key} className="flex items-center gap-2">
                <span className="text-primary/80">
                  {isComplete ? "✔" : isActive ? ">" : "."}
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Icon className="h-3 w-3 opacity-80" />
                  <span className="tracking-tight">
                    {label}
                  </span>
                  {isActive && <AnimatedDots />}
                  {isComplete && !isActive && (
                    <Check className="h-3 w-3 text-emerald-500" />
                  )}
                </div>
              </div>
            )
          })}

          <AnimatePresence mode="wait">
            <motion.div
              key={displayStage.key}
              initial={{ opacity: 0, y: 1 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground/80"
            >
              {activeHints.map((hint) => (
                <motion.span
                  key={`${displayStage.key}-${hint}`}
                  initial={{ opacity: 0, y: 1 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="px-1.5 py-0.5 rounded-sm bg-muted/40"
                >
                  {hint}
                </motion.span>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="relative mt-1 h-[2px] w-full overflow-hidden rounded-full bg-muted/40">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/80"
              initial={false}
              animate={{ width: `${Math.min(progress, 1) * 100}%` }}
              transition={{ duration: 0.7, ease: [0.3, 0.8, 0.4, 1] }}
            />
          </div>
        </div>
      </div>
    </div>
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
