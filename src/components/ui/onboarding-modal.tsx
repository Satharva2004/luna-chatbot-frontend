"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "./dialog"
import { Youtube, ImageIcon, FileText, GitBranch, Zap, X, ArrowRight } from "lucide-react"
import { Button } from "./button"

interface Props {
  open: boolean
  onClose: () => void
}

const FEATURES = [
  { icon: Youtube,    label: "YouTube Search",  desc: "Pull in video tutorials alongside any answer" },
  { icon: ImageIcon,  label: "Image Search",     desc: "Visual results right inside the response" },
  { icon: FileText,   label: "File Upload",      desc: "Analyse PDFs, docs, and spreadsheets" },
  { icon: GitBranch,  label: "Flowcharts",       desc: "Auto-generate interactive diagrams" },
  { icon: Zap,        label: "Model Selector",   desc: "Switch between Fast, Smart and Best" },
]

export function OnboardingModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0)
  const isLast = step === 1

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border border-border/40 bg-background/95 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
        <DialogTitle className="sr-only">Welcome to Luna</DialogTitle>

        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-10 rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {step === 0 && (
          <div className="flex flex-col px-7 pb-7 pt-8">
            {/* Logo */}
            <div className="mb-6 flex items-center gap-2.5">
              <img
                src="/main logo.jfif"
                alt="Luna"
                className="h-8 w-8 rounded-xl object-cover"
              />
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Luna<span className="text-muted-foreground">AI</span>
              </span>
            </div>

            <h2 className="text-2xl font-semibold leading-tight text-foreground">
              Your AI research<br />assistant.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Real-time web search, visual content, interactive diagrams, and multi-model AI — all in one place.
            </p>

            {/* Thin divider */}
            <div className="my-6 h-px w-full bg-border/60" />

            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">What&apos;s included</p>
            <ul className="space-y-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Icon className="h-3.5 w-3.5 text-foreground/70" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col px-7 pb-7 pt-8">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
              <ArrowRight className="h-5 w-5 text-foreground/80" />
            </div>
            <h2 className="text-2xl font-semibold leading-tight text-foreground">
              Ready when<br />you are.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Open the <span className="font-medium text-foreground">Tools</span> menu in the prompt bar to toggle YouTube, images, and pick your model. The more context you give, the better Luna gets.
            </p>

            <div className="mt-6 rounded-xl border border-border/50 bg-secondary/40 px-4 py-3">
              <p className="text-xs font-medium text-foreground">Quick tip</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch to <span className="font-medium text-foreground">Smart</span> or <span className="font-medium text-foreground">Best</span> for deep research. Use <span className="font-medium text-foreground">Fast</span> for quick answers.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 px-7 py-4">
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-5 bg-foreground' : 'w-1 bg-muted-foreground/30'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(0)}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Back
              </button>
            )}
            <Button
              size="sm"
              onClick={() => isLast ? onClose() : setStep(1)}
              className="h-7 rounded-full px-4 text-xs"
            >
              {isLast ? "Let's go" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
