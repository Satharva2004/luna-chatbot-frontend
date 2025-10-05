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
    description: "Collecting the latest insights",
    icon: Search,
  },
  {
    key: "responding",
    title: "Generating insights",
    description: "Crafting a detailed answer",
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
  const detailText = stageDetails?.[displayStage.key] ?? displayStage.description
  const StageIcon = displayStage.icon

  const completedCount = STAGE_CONFIG.filter(({ key }) => mergedStatuses[key] === "complete").length
  const progress = Math.max(0.05, (completedCount + (displayState === "active" ? 0.35 : 0)) / STAGE_CONFIG.length)
  const hints = sourceHints?.[displayStage.key] ?? DEFAULT_SOURCE_HINTS[displayStage.key]

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[17rem] sm:max-w-sm rounded-xl px-3 py-2.5 sm:px-4 shadow-[0_6px_20px_-18px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-2.5">
          <motion.div
            layout
            className="grid h-[1.45rem] w-[1.45rem] sm:h-[1.65rem] sm:w-[1.65rem] place-items-center rounded-full bg-primary/12 text-primary"
          >
            <StageIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </motion.div>
          <div className="flex-1 space-y-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={displayStage.key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-1"
              >
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-foreground">
                  <span className="font-medium tracking-tight">{displayStage.title}</span>
                  {displayState === "active" ? (
                    <AnimatedDots />
                  ) : displayState === "complete" ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : null}
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${displayStage.key}-${detailText}`}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="text-[10px] sm:text-[11px] text-muted-foreground"
                  >
                    {detailText}
                  </motion.p>
                </AnimatePresence>
                <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
                  {hints.map((hint) => (
                    <motion.span
                      key={`${displayStage.key}-${hint}`}
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      transition={{ duration: 0.1, ease: "easeOut" }}
                      className="rounded-full   px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9.5px] text-muted-foreground"
                    >
                      {hint}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="relative h-[1.5px] sm:h-[1.75px] w-full overflow-hidden rounded-full">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                initial={false}
                animate={{ width: `${Math.min(progress, 1) * 100}%` }}
                transition={{ duration: 0.1, ease: [0.3, 0.8, 0.4, 1] }}
              />
            </div>
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
