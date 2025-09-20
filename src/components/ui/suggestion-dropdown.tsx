"use client"

import * as React from "react"
import { Command, CommandList, CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react" // Import the search icon

interface SuggestionDropdownProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  inputValue: string
  className?: string
}

export function SuggestionDropdown({
  suggestions,
  onSelect,
  inputValue,
  className,
}: SuggestionDropdownProps) {
  const [filtered, setFiltered] = React.useState<string[]>([])

  React.useEffect(() => {
    if (inputValue.trim().length > 0) {
      const filtered = suggestions
        .filter(suggestion => 
          suggestion.toLowerCase().includes(inputValue.toLowerCase())
        )
        .slice(0, 5)
      setFiltered(filtered)
    } else {
      setFiltered([])
    }
  }, [inputValue, suggestions])

  if (filtered.length === 0) return null

  return (
    <div 
      className={cn(
        "absolute bottom-full left-0 right-0 z-50 mb-2 rounded-lg border bg-popover shadow-lg",
        className
      )}
    >
      <Command className="rounded-lg">
        <CommandList>
          <div className="max-h-[300px] overflow-y-auto">
            {filtered.map((suggestion) => (
              <CommandItem
                key={suggestion}
                value={suggestion}
                onSelect={() => onSelect(suggestion)}
                className={cn(
                  "px-4 py-2 text-sm cursor-pointer flex items-center gap-2",
                  "hover:bg-accent hover:text-accent-foreground",
                  "transition-colors duration-150"
                )}
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <span>{suggestion}</span>
              </CommandItem>
            ))}
          </div>
        </CommandList>
      </Command>
    </div>
  )
}