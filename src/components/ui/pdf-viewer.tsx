'use client';

import React from 'react';
import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface CustomPDFViewerProps {
  url: string;
  className?: string;
  height?: string;
}

export const CustomPDFViewer: React.FC<CustomPDFViewerProps> = ({
  url,
  className,
  height = '600px'
}) => {
  const { theme } = useTheme();

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border shadow-md bg-background",
        className
      )}
      style={{ height }}
    >
      <PDFViewer
        config={{
          src: url,
          theme: {
            preference: theme === 'dark' ? 'dark' : 'light'
          },
          // Customizing the experience for an educational context
          // Enable zoom, document manager, etc.
          zoom: {
            defaultZoomLevel: 1.0
          }
        }}
      />
    </div>
  );
};

export default CustomPDFViewer;
