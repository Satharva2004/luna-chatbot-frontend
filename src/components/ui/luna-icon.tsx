import * as React from "react"

import { cn } from "@/lib/utils"

export function LunaIcon({
  className,
  animated = true,
}: {
  className?: string
  animated?: boolean
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        animated && "luna-icon",
        className
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-primary/15 blur-[10px]",
          animated && "luna-pulse"
        )}
      />

      <svg
        viewBox="0 0 24 24"
        className="relative z-10 h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Core moon */}
        <path
          d="M16.9 15.9A7.6 7.6 0 0 1 8.1 7.1a7.9 7.9 0 1 0 8.8 8.8Z"
          className="fill-primary"
          opacity="0.95"
        />

        {/* Inner highlight */}
        <path
          d="M15.7 15.1A6.2 6.2 0 0 1 8.9 8.3a6.4 6.4 0 1 0 6.8 6.8Z"
          className="fill-primary/40"
        />

        {/* Orbiting star */}
        <g className={cn(animated && "luna-orbit")}>
          <circle cx="19.2" cy="8.2" r="1.2" className="fill-primary" />
          <circle cx="19.2" cy="8.2" r="2.4" className="fill-primary/15" />
        </g>
      </svg>
    </span>
  )
}

