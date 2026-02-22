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
            <div className="relative w-full rounded-b-2xl overflow-hidden bg-white dark:bg-slate-800" style={{ height, minHeight: height }}>
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
            <div className={`group/flowchart mt-6 overflow-hidden rounded-2xl border border-border/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:bg-slate-900 dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${className}`}>
                <div className="flex items-center justify-between border-b border-border/40 bg-gradient-to-r from-slate-50/90 to-white/90 px-4 py-2.5 backdrop-blur-md dark:from-slate-800/90 dark:to-slate-900/90">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 shadow-sm ring-1 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M3 12h18" />
                                <path d="M3 6h18" />
                                <path d="M3 18h18" />
                            </svg>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
                            Flowchart Visualizer
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={safeScrollToContent}
                            className="h-8 gap-2 rounded-lg px-2.5 text-slate-600 hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                            title="Fit content to view"
                        >
                            <Minimize2 className="h-3.5 w-3.5 rotate-45" />
                            <span className="text-[11px] font-medium">Fit</span>
                        </Button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveJson}
                            className="h-8 gap-2 rounded-lg px-2.5 text-slate-600 hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                        >
                            <FileJson className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium">Json</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="h-8 gap-2 rounded-lg px-2.5 text-slate-600 hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                        >
                            {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            <span className="text-[11px] font-medium">Export</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsFullscreen(true)}
                            className="h-8 gap-2 rounded-lg bg-blue-600/5 px-3 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-400/10 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-slate-900"
                        >
                            <Maximize2 className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-bold">Expand</span>
                        </Button>
                    </div>
                </div>
                {renderExcalidraw()}
            </div>

            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl">
                    <DialogTitle className="sr-only">Flowchart Fullscreen View</DialogTitle>
                    <div className="flex items-center justify-between border-b border-border/40 bg-slate-50/80 px-6 py-3.5 backdrop-blur-md dark:bg-slate-800/80 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 12h18" />
                                    <path d="M3 6h18" />
                                    <path d="M3 18h18" />
                                </svg>
                            </div>
                            <div>
                                <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Flowchart Visualizer
                                </span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                                    Fullscreen Mode
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveJson}
                                className="h-9 gap-2 rounded-xl px-4 text-slate-600 hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                            >
                                <FileJson className="h-4 w-4" />
                                <span className="text-xs font-medium">Save JSON</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="h-9 gap-2 rounded-xl px-4 text-slate-600 hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                            >
                                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                <span className="text-xs font-medium">Export PNG</span>
                            </Button>
                            <div className="mx-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsFullscreen(false)}
                                className="h-9 w-9 rounded-xl p-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                            >
                                <Minimize2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative bg-white dark:bg-slate-900">
                        {renderExcalidraw('100%')}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
