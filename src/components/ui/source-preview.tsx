import React from 'react';
import { ExternalLink } from 'lucide-react';

interface SourcePreviewProps {
  sources: string[];
}

export function SourcePreview({ sources }: SourcePreviewProps) {
  if (!sources || sources.length === 0) return null;

  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  // Format the URL for display (remove query parameters and fragments)
  const formatDisplayUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname}`.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Sources</h4>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start p-2 rounded-md hover:bg-muted transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-sm font-medium truncate">
                <span className="truncate">{formatDisplayUrl(source)}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {getDomain(source)}
              </div>
            </div>
            <div className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
              {index + 1}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
