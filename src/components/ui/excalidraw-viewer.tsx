"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Download, Maximize2, Minimize2, Loader2, FileJson } from 'lucide-react'
import { Button } from './button'
import { Dialog, DialogContent, DialogTitle } from './dialog'
import { sanitizeExcalidrawElements } from '@/lib/excalidraw-sanitizer'

// IMPORTANT: Import Excalidraw styles to fix UI rendering
import "@excalidraw/excalidraw/index.css";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
    () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-800 min-h-[500px]">
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

export function ExcalidrawViewer({ data, className = '' }: ExcalidrawViewerProps) {
    // Safety guard
    if (!data) {
        console.warn('⚠️ ExcalidrawViewer: No data provided')
        return null
    }

    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
    const excalidrawAPIRef = useRef<any>(null)
    const [key, setKey] = useState(0)

    // Memoize sanitized elements to prevent re-calculations
    const sanitizedElements = useMemo(() => sanitizeExcalidrawElements(data.elements), [data.elements])

    // Capture API and ref
    const onExcalidrawAPIChange = useCallback((api: any) => {
        console.log('🔄 ExcalidrawViewer: API Ready', !!api)
        setExcalidrawAPI(api)
        excalidrawAPIRef.current = api
    }, [])

    // Safe scroll to content function
    const safeScrollToContent = useCallback(() => {
        if (!excalidrawAPIRef.current) return

        const elements = excalidrawAPIRef.current.getSceneElements();
        if (!elements || elements.length === 0) return

        try {
            // Use Excalidraw's native scrolling which is more robust
            excalidrawAPIRef.current.scrollToContent(elements, {
                fitToViewport: true,
                viewportZoomFactor: 0.9,
                animate: true
            })

            // Double check zoom state after small delay to fix NaN if it occurred
            setTimeout(() => {
                const state = excalidrawAPIRef.current.getAppState();
                if (!Number.isFinite(state.zoom.value) || state.zoom.value <= 0) {
                    console.warn('⚠️ ExcalidrawViewer: NaN zoom detected after auto-scroll, fixing...')
                    excalidrawAPIRef.current.updateScene({
                        appState: { zoom: { value: 1 as any }, scrollX: 0, scrollY: 0 }
                    })
                }
            }, 100)

        } catch (err) {
            console.error('❌ ExcalidrawViewer: safeScrollToContent failed', err)
        }
    }, [])

    // Center content when API is ready
    useEffect(() => {
        if (!excalidrawAPI) return

        // Wait slightly for canvas to layout
        const timer = setTimeout(() => {
            safeScrollToContent()
        }, 100)

        return () => clearTimeout(timer)
    }, [excalidrawAPI, safeScrollToContent])

    const handleDownload = async () => {
        if (!excalidrawAPI) return

        try {
            setIsDownloading(true)
            const { exportToBlob } = await import('@excalidraw/excalidraw')

            const elements = excalidrawAPI.getSceneElements()
            const appState = excalidrawAPI.getAppState()

            const blob = await exportToBlob({
                elements: elements,
                appState: {
                    ...appState,
                    exportBackground: true,
                    viewBackgroundColor: appState.viewBackgroundColor || '#ffffff'
                },
                files: data.files,
                mimeType: 'image/png'
            })

            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            // Sanitize filename
            const filename = `flowchart-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`
            link.download = filename
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

    const handleSaveJson = async () => {
        if (!excalidrawAPI) return

        try {
            const elements = excalidrawAPI.getSceneElements()
            const appState = excalidrawAPI.getAppState()

            const payload = {
                type: 'excalidraw',
                version: 2,
                source: 'https://excalidraw.com',
                elements: elements,
                appState: {
                    viewBackgroundColor: appState.viewBackgroundColor,
                    gridSize: appState.gridSize
                },
                files: data.files || {}
            }

            const json = JSON.stringify(payload, null, 2)
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            const filename = `flowchart-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.excalidraw`
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Failed to save JSON:', error)
        }
    }

    const renderExcalidraw = (height: string = '500px') => {
        // Generate a unique key based on content to force clean re-mounts
        const contentKey = `excalidraw-${sanitizedElements.length}-${sanitizedElements[0]?.id || 'empty'}`;

        return (
            <div className="relative w-full rounded-b-xl overflow-hidden bg-white" style={{ height, minHeight: height }}>
                <Excalidraw
                    key={contentKey}
                    excalidrawAPI={onExcalidrawAPIChange}
                    initialData={{
                        elements: sanitizedElements || [],
                        appState: {
                            viewBackgroundColor: data.appState?.viewBackgroundColor || '#ffffff',
                            gridSize: data.appState?.gridSize || undefined,
                            zoom: { value: 1 as any },
                            scrollX: 0,
                            scrollY: 0
                        },
                        scrollToContent: true
                    }}
                    viewModeEnabled={false}
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
                            onClick={safeScrollToContent}
                            className="h-8 px-3"
                            title="Fit execution to screen"
                        >
                            <Minimize2 className="h-4 w-4 rotate-45" />
                            <span className="ml-2 text-xs">Fit</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveJson}
                            className="h-8 px-3"
                        >
                            <FileJson className="h-4 w-4" />
                            <span className="ml-2 text-xs">Save</span>
                        </Button>
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
                                onClick={handleSaveJson}
                                className="h-8 px-3"
                            >
                                <FileJson className="h-4 w-4" />
                                <span className="ml-2 text-xs">Save</span>
                            </Button>
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
