import { ReactNode } from 'react';
import { MessageSquare } from 'lucide-react';

interface PromptSuggestionsProps {
  label: ReactNode;
  append: (message: { role: "user"; content: string }) => void;
  suggestions: string[];
}

export function PromptSuggestions({
  label,
  append,
  suggestions,
}: PromptSuggestionsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col items-center justify-center space-y-4">

        <h1 className="text-md text-center text-muted-foreground">How can I help you today?</h1>
        
        <div className="w-full space-y-4">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => append({ role: "user", content: suggestion })}
              className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors duration-200 flex items-start gap-3 group"
            >
              <MessageSquare className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{suggestion}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
