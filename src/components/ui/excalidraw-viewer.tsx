"use client"

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Download, Maximize2, Minimize2, Loader2 } from 'lucide-react'
import { Button } from './button'
import { Dialog, DialogContent, DialogTitle } from './dialog'

// IMPORTANT: Import Excalidraw styles to fix UI rendering
import "@excalidraw/excalidraw/index.css";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
    () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-800">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        ),
    }
)

export interface ExcalidrawData {
    type: 'excalidraw'
    version: number
    source: string
    elements: any[]
    appState: {
        gridSize: number | null
        viewBackgroundColor: string
    }
    files: Record<string, any>
}

interface ExcalidrawViewerProps {
    data: ExcalidrawData
    className?: string
}

// Validation helper to prevent "New element size or position is too large" errors and missing properties
const sanitizeElements = (elements: any[]) => {
    if (!Array.isArray(elements)) return []

    return elements.filter(el => {
        // Ensure element is an object and has a type
        if (!el || typeof el !== 'object') return false
        if (!el.type || typeof el.type !== 'string') return false // CRITICAL: Excalidraw crashes if type is missing

        // Basic coordinate validation
        const isValidNumber = (n: any) => typeof n === 'number' && Number.isFinite(n) && !Number.isNaN(n)

        // Excalidraw has limits on coordinate size (usually +/- 30000-50000 is safe visual range, 
        // internal limits are higher but we want to catch AI hallucinations)
        const MAX_COORD = 50000

        const validCoords =
            isValidNumber(el.x) && Math.abs(el.x) < MAX_COORD &&
            isValidNumber(el.y) && Math.abs(el.y) < MAX_COORD &&
            isValidNumber(el.width) && Math.abs(el.width) < MAX_COORD &&
            isValidNumber(el.height) && Math.abs(el.height) < MAX_COORD

        if (!validCoords) {
            console.warn('⚠️ Filtered out invalid Excalidraw element:', el)
        }

        return validCoords
    })
}

export function ExcalidrawViewer({ data, className = '' }: ExcalidrawViewerProps) {
    // Safety guard
    if (!data) {
        console.warn('⚠️ ExcalidrawViewer: No data provided')
        return null
    }

    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
    const [key, setKey] = useState(0) // Used to force re-render if needed

    // Memoize sanitized elements to prevent re-calculations
    const sanitizedElements = useMemo(() => sanitizeElements(data.elements), [data.elements])

    // Update scene when data changes
    useEffect(() => {
        if (!excalidrawAPI) return

        console.log('🔄 ExcalidrawViewer: Scene update triggered', {
            elementCount: sanitizedElements.length,
            hasAPI: !!excalidrawAPI
        })

        if (!sanitizedElements || sanitizedElements.length === 0) {
            console.warn('⚠️ ExcalidrawViewer: No elements to render')
            return
        }

        // Small delay to ensure the component is fully mounted and ready for scene updates
        const timer = setTimeout(() => {
            requestAnimationFrame(() => {
                try {
                    console.log('🎨 ExcalidrawViewer: Updating scene...')

                    // Force update the scene
                    excalidrawAPI.updateScene({
                        elements: sanitizedElements,
                        appState: {
                            viewBackgroundColor: data.appState?.viewBackgroundColor || '#ffffff',
                            gridSize: data.appState?.gridSize || undefined,
                            // Important to avoid carrying over previous state that might conflict
                            isLoading: false,
                        },
                        commitToHistory: false
                    })

                    // Center content
                    if (sanitizedElements.length > 0) {
                        console.log('🔭 ExcalidrawViewer: Scrolling to content...')
                        excalidrawAPI.scrollToContent(sanitizedElements, {
                            fitToViewport: true,
                            viewportZoomFactor: 0.8, // Zoom out a bit more to be safe
                            animate: false // Disable animation for initial render to ensure instant visibility
                        })
                    }
                } catch (error) {
                    console.error('❌ Failed to update Excalidraw scene:', error)
                }
            })
        }, 500) // Increased delay to 500ms to allow layout to settle

        return () => clearTimeout(timer)
    }, [excalidrawAPI, sanitizedElements, data.appState])

    const handleDownload = async () => {
        try {
            setIsDownloading(true)
            // Dynamically import utility to avoid SSR issues
            const { exportToBlob } = await import('@excalidraw/excalidraw')

            const blob = await exportToBlob({
                elements: sanitizedElements,
                appState: data.appState,
                files: data.files,
                mimeType: 'image/png'
            })

            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `flowchart-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Failed to download flowchart:', error)
        } finally {
            setIsDownloading(false)
        }
    }

    const renderExcalidraw = (height: string = '500px') => {
        return (
            <div className="relative w-full rounded-b-xl overflow-hidden" style={{ height }}>
                <Excalidraw
                    key={key}
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    initialData={{
                        elements: sanitizedElements || [],
                        appState: {
                            viewBackgroundColor: data.appState?.viewBackgroundColor || '#ffffff',
                            gridSize: data.appState?.gridSize || undefined,
                        },
                        scrollToContent: true
                    }}
                    viewModeEnabled={false} // Allow interaction
                    zenModeEnabled={false}
                    gridModeEnabled={true}
                    theme="light"
                    name="Flowchart"
                    UIOptions={{
                        canvasActions: {
                            changeViewBackgroundColor: true,
                            clearCanvas: false,
                            loadScene: false,
                            saveToActiveFile: false,
                            toggleTheme: false,
                            saveAsImage: false
                        }
                    }}
                />
            </div>
        )
    }


    return (
        <>
            <div className={`mt-4 overflow-hidden rounded-xl border border-border/60 bg-white dark:bg-gray-900 ${className}`}>
                <div className="flex items-center justify-between border-b border-border/60 bg-gray-50 px-4 py-2 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <svg
                            className="h-5 w-5 text-blue-600 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            FLOWCHART
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="h-8 px-3"
                        >
                            <Download className="h-4 w-4" />
                            <span className="ml-2 text-xs">{isDownloading ? 'Downloading...' : 'Download'}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsFullscreen(true)}
                            className="h-8 px-3"
                        >
                            <Maximize2 className="h-4 w-4" />
                            <span className="ml-2 text-xs">Expand</span>
                        </Button>
                    </div>
                </div>
                {renderExcalidraw()}
            </div>

            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
                    <DialogTitle className="sr-only">Flowchart Fullscreen View</DialogTitle>
                    <div className="flex items-center justify-between border-b border-border/60 bg-gray-50 px-4 py-3 dark:bg-gray-800 shrink-0">
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-5 w-5 text-blue-600 dark:text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                FLOWCHART (Fullscreen)
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="h-8 px-3"
                            >
                                <Download className="h-4 w-4" />
                                <span className="ml-2 text-xs">{isDownloading ? 'Downloading...' : 'Download'}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsFullscreen(false)}
                                className="h-8 px-3"
                            >
                                <Minimize2 className="h-4 w-4" />
                                <span className="ml-2 text-xs">Close</span>
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        {renderExcalidraw('100%')}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
