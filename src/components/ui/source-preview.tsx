import React from 'react';
import { Search } from 'lucide-react';

interface SourcePreviewProps {
  sources: string[];
}

export function SourcePreview({ sources }: SourcePreviewProps) {
  if (!sources || sources.length === 0) return null;

  const visibleSources = sources.slice(0, 4);
  const extraSources = sources.length > 4 ? sources.slice(4) : [];

  return (
    <div className="mt-4 bg-muted/30 rounded-lg p-3 border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-border/50">
            <Search className="h-3.5 w-3.5" />
            <span>Web Search</span>
          </div>
          <span className="text-xs text-muted-foreground/70">
            Sources from the web
          </span>
        </div>
        <span className="text-xs bg-muted-foreground/10 text-muted-foreground rounded-full px-2 py-1">
          {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        </span>
      </div>

      {/* Visible Sources */}
      <div className="space-y-2">
        {visibleSources.map((source, index) => (
          <SourceItem key={index} source={source} index={index} />
        ))}
      </div>

      {/* Extra Collapsible Sources */}
      {extraSources.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-muted-foreground/70 mb-1">
            +{extraSources.length} more source
            {extraSources.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30">
            {extraSources.map((source, index) => (
              <SourceItem
                key={index + visibleSources.length}
                source={source}
                index={index + visibleSources.length}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SourceItemProps {
  source: string;
  index: number;
}

function SourceItem({ source, index }: SourceItemProps) {
  const displayUrl = (() => {
    try {
      const u = new URL(source);
      return u.hostname.replace("www.", "");
    } catch {
      return source;
    }
  })();

  return (
    <a
      href={source}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-border/30 bg-background overflow-hidden hover:shadow-md transition"
    >
      {/* Thumbnail via Microlink */}
      <img
        src={`https://api.microlink.io/?url=${encodeURIComponent(
          source
        )}&screenshot=true&meta=false`}
        alt="preview"
        className="w-full h-32 object-cover"
      />

      {/* Info */}
      <div className="p-2 flex items-center justify-between">
        <div className="truncate">
          <div className="text-sm font-medium truncate">{displayUrl}</div>
          <div className="text-xs text-muted-foreground truncate">{source}</div>
        </div>
        <div className="ml-2 flex-shrink-0 text-xs text-muted-foreground/70 bg-muted rounded-full w-5 h-5 flex items-center justify-center">
          {index + 1}
        </div>
      </div>
    </a>
  );
}
