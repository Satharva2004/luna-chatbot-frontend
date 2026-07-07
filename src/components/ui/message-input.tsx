"use client"

import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Check, ChevronDown, Image as ImageIcon, Info, Loader2, Mic, Paperclip, Square, Youtube } from "lucide-react"
import { omit } from "remeda"

import { cn } from "@/lib/utils"
import { useAudioRecording } from "@/hooks/use-audio-recording"
import { useAutosizeTextArea } from "@/hooks/use-autosize-textarea"
import { AudioVisualizer } from "@/components/ui/audio-visualizer"
import { Button } from "@/components/ui/button"
import { FilePreview } from "@/components/ui/file-preview"
import { InterruptPrompt } from "@/components/ui/interrupt-prompt"
import { Switch } from "@/components/ui/switch"

interface MessageInputBaseProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'> {
  inputRef?: React.Ref<HTMLTextAreaElement>
  value: string
  submitOnEnter?: boolean
  stop?: () => void
  isGenerating: boolean
  enableInterrupt?: boolean
  transcribeAudio?: (blob: Blob) => Promise<string>
  includeYouTube?: boolean
  onToggleYouTube?: (next: boolean) => void
  includeImageSearch?: boolean
  onToggleImageSearch?: (next: boolean) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
}

interface MessageInputWithoutAttachmentProps extends MessageInputBaseProps {
  allowAttachments?: false
}

interface MessageInputWithAttachmentsProps extends MessageInputBaseProps {
  allowAttachments: true
  files: File[] | null
  setFiles: React.Dispatch<React.SetStateAction<File[] | null>>
  includeYouTube?: boolean
  onToggleYouTube?: (next: boolean) => void
}

type MessageInputProps =
  | MessageInputWithoutAttachmentProps
  | MessageInputWithAttachmentsProps

const MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash-lite', label: 'Fast' },
  { value: 'gemini-2.5-flash', label: 'Smart' },
  { value: 'gemini-2.5-pro', label: 'Best' },
]

export function MessageInput({
  placeholder = "Ask AI...",
  className,
  onKeyDown: onKeyDownProp,
  submitOnEnter = true,
  stop,
  isGenerating,
  enableInterrupt = true,
  transcribeAudio,
  includeYouTube = true,
  onToggleYouTube,
  includeImageSearch = true,
  onToggleImageSearch,
  selectedModel = 'gemini-2.5-flash-lite',
  onModelChange,
  inputRef,
  ...props
}: MessageInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showInterruptPrompt, setShowInterruptPrompt] = useState(false)
  const [showYouTubeMenu, setShowYouTubeMenu] = useState(false)

  const {
    isListening,
    isSpeechSupported,
    isRecording,
    isTranscribing,
    audioStream,
    toggleListening,
    stopRecording,
  } = useAudioRecording({
    transcribeAudio,
    onTranscriptionComplete: (text) => {
      props.onChange?.({ target: { value: text } } as unknown as React.ChangeEvent<HTMLTextAreaElement>)
    },
  })

  useEffect(() => {
    if (!isGenerating) {
      setShowInterruptPrompt(false)
    }
  }, [isGenerating])

  const addFiles = (files: File[] | null) => {
    if (props.allowAttachments) {
      props.setFiles((currentFiles) => {
        if (currentFiles === null) {
          return files
        }

        if (files === null) {
          return currentFiles
        }

        return [...currentFiles, ...files]
      })
    }
  }

  const onDragOver = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (event: React.DragEvent) => {
    setIsDragging(false)
    if (props.allowAttachments !== true) return
    event.preventDefault()
    const dataTransfer = event.dataTransfer
    if (dataTransfer.files.length) {
      addFiles(Array.from(dataTransfer.files))
    }
  }

  const onPaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    const text = event.clipboardData.getData("text")
    if (text && text.length > 500 && props.allowAttachments) {
      event.preventDefault()
      const blob = new Blob([text], { type: "text/plain" })
      const file = new File([blob], "Pasted text", {
        type: "text/plain",
        lastModified: Date.now(),
      })
      addFiles([file])
      return
    }

    const files = Array.from(items)
      .map((item) => item.getAsFile())
      .filter((file) => file !== null)

    if (props.allowAttachments && files.length > 0) {
      addFiles(files)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitOnEnter && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()

      if (isGenerating && stop && enableInterrupt) {
        if (showInterruptPrompt) {
          stop()
          setShowInterruptPrompt(false)
          event.currentTarget.form?.requestSubmit()
        } else if (
          props.value ||
          (props.allowAttachments && props.files?.length)
        ) {
          setShowInterruptPrompt(true)
          return
        }
      }

      event.currentTarget.form?.requestSubmit()
    }

    onKeyDownProp?.(event)
  }

  const internalTextAreaRef = useRef<HTMLTextAreaElement>(null)
  const setTextAreaRefs = React.useCallback((node: HTMLTextAreaElement | null) => {
    internalTextAreaRef.current = node

    if (typeof inputRef === "function") {
      inputRef(node)
      return
    }

    if (inputRef && "current" in inputRef) {
      inputRef.current = node
    }
  }, [inputRef])
  const [textAreaHeight, setTextAreaHeight] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const youTubeMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = internalTextAreaRef.current
    if (element) {
      setTextAreaHeight(element.offsetHeight)
    }
  }, [props.value])

  useEffect(() => {
    if (!showYouTubeMenu) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (youTubeMenuRef.current && !youTubeMenuRef.current.contains(target)) {
        setShowYouTubeMenu(false)
      }
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowYouTubeMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)

    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [showYouTubeMenu])

  const showFileList =
    props.allowAttachments && props.files && props.files.length > 0

  useAutosizeTextArea({
    ref: internalTextAreaRef,
    maxHeight: 240,
    borderWidth: 1,
    dependencies: [props.value, showFileList],
  })

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {enableInterrupt && (
        <InterruptPrompt
          isOpen={showInterruptPrompt}
          close={() => setShowInterruptPrompt(false)}
        />
      )}

      <RecordingPrompt
        isVisible={isRecording}
        onStopRecording={stopRecording}
      />

      <div className="relative flex w-full items-center space-x-2">
        <div className="relative flex-1">
          <textarea
            aria-label="Write your prompt here"
            placeholder={placeholder}
            ref={setTextAreaRefs}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            className={cn(
              "z-10 w-full grow resize-none rounded-[20px] border border-border/60 bg-card/75 backdrop-blur-xl p-3 pr-24 text-sm text-foreground transition-all duration-150 placeholder:text-muted-foreground focus-visible:border-border/90 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-border/60 dark:bg-[#1c1c1e]/75 dark:text-[#f5f5f7] dark:placeholder:text-[#86868b] dark:focus-visible:border-border/80 shadow-none",
              showFileList && "pb-16",
              className
            )}
            {...(props.allowAttachments
              ? omit(props, ["allowAttachments", "files", "setFiles"])
              : omit(props, ["allowAttachments"]))}
          />

          {props.allowAttachments && (
            <div className="absolute inset-x-3 bottom-0 z-20 overflow-x-scroll py-3">
              <div className="flex items-center space-x-3">
                <AnimatePresence mode="popLayout">
                  {props.files?.map((file) => {
                    return (
                      <FilePreview
                        key={file.name + String(file.lastModified)}
                        file={file}
                        onRemove={() => {
                          props.setFiles((files) => {
                            if (!files) return null

                            const filtered = Array.from(files).filter(
                              (f) => f !== file
                            )
                            if (filtered.length === 0) return null
                            return filtered
                          })
                        }}
                      />
                    )
                  })}
                </AnimatePresence>
                {props.files && props.files.length > 1 && (
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {props.files.length} files
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-3 top-3 z-20 flex gap-2">
        {(onToggleYouTube || onToggleImageSearch) && (
          <div ref={youTubeMenuRef} className="relative">
            <Button
              type="button"
              size="sm"
              variant={includeYouTube ? "default" : "outline"}
              className={cn(
                "h-8 gap-1 rounded-lg border border-border/60 bg-secondary/80 px-2.5 text-muted-foreground shadow-none hover:bg-secondary hover:text-foreground dark:border-border/60 dark:bg-secondary/80 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground",
                includeYouTube && "bg-secondary text-foreground dark:bg-secondary dark:text-foreground",
                !includeYouTube && "opacity-90"
              )}
              aria-label="Toggle tools menu"
              aria-haspopup="menu"
              aria-expanded={showYouTubeMenu}
              aria-pressed={includeYouTube}
              onClick={() => setShowYouTubeMenu((value) => !value)}
            >
              <span className="text-sm font-medium">Tools</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
            {showYouTubeMenu && (
              <div
                role="menu"
                aria-label="Tools"
                className="absolute bottom-full left-1/2 z-30 mb-2 w-48 -translate-x-1/2 rounded-xl border border-border/80 bg-background p-2 text-popover-foreground shadow-[0_12px_32px_rgba(0,0,0,0.1)] dark:border-[#404244] dark:bg-[#202122] dark:shadow-[0_16px_32px_rgba(0,0,0,0.3)]"
              >
                {onToggleYouTube && (
                  <div
                    role="menuitem"
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm"
                  >
                    <label
                      htmlFor="message-input-youtube-switch"
                      className="flex items-center gap-2 font-medium"
                    >
                      <Youtube className="h-4 w-4" />
                      <span>YouTube</span>
                    </label>
                    <Switch
                      id="message-input-youtube-switch"
                      checked={includeYouTube}
                      onCheckedChange={(checked: boolean) => {
                        onToggleYouTube(checked)
                      }}
                      aria-label="Toggle YouTube tool"
                    />
                  </div>
                )}
                {onToggleImageSearch && (
                  <div
                    role="menuitem"
                    className="mt-1 flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm"
                  >
                    <label
                      htmlFor="message-input-image-switch"
                      className="flex items-center gap-2 font-medium"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>Web Images</span>
                    </label>
                    <Switch
                      id="message-input-image-switch"
                      checked={includeImageSearch}
                      onCheckedChange={(checked: boolean) => {
                        onToggleImageSearch(checked)
                      }}
                      aria-label="Toggle image search"
                    />
                  </div>
                )}
                {props.allowAttachments && (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={async () => {
                      const files = await showFileUploadDialog()
                      if (files) {
                        addFiles(files)
                      }
                    }}
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>Upload files</span>
                  </button>
                )}
                {onModelChange && (
                  <div className="mt-1 border-t border-border/60 pt-1">
                    <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Model</p>
                    {MODEL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        role="menuitem"
                        className={cn(
                          "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                          selectedModel === opt.value && "bg-accent text-accent-foreground font-medium"
                        )}
                        onClick={() => {
                          onModelChange(opt.value)
                          setShowYouTubeMenu(false)
                        }}
                      >
                        <span>{opt.label}</span>
                        {selectedModel === opt.value && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* {props.allowAttachments && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Attach a file"
            onClick={async () => {
              const files = await showFileUploadDialog()
              addFiles(files)
            }}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        )} */}
        {isSpeechSupported && (
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-8 w-8 rounded-lg border border-border/60 bg-secondary/80 text-muted-foreground shadow-none hover:bg-secondary hover:text-foreground dark:border-border/60 dark:bg-secondary/80 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground",
              isListening && "text-foreground dark:text-foreground"
            )}
            aria-label="Voice input"
            size="icon"
            onClick={toggleListening}
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
        {isGenerating && stop ? (
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border/60 bg-secondary/80 text-muted-foreground shadow-none hover:bg-secondary hover:text-foreground dark:border-border/60 dark:bg-secondary/80 dark:text-foreground dark:hover:bg-secondary"
            aria-label="Stop generating"
            onClick={stop}
          >
            <Square className="h-3 w-3 animate-pulse" fill="currentColor" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 rounded-lg border-0 bg-primary text-primary-foreground shadow-none hover:opacity-90 disabled:bg-secondary disabled:text-muted-foreground"
            aria-label="Send message"
            disabled={props.value === "" || isGenerating}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>

      {props.allowAttachments && <FileUploadOverlay isDragging={isDragging} />}

      <RecordingControls
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        audioStream={audioStream}
        textAreaHeight={textAreaHeight}
        onStopRecording={stopRecording}
      />
    </div>
  )
}
MessageInput.displayName = "MessageInput"

interface FileUploadOverlayProps {
  isDragging: boolean
}

function FileUploadOverlay({ isDragging }: FileUploadOverlayProps) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center space-x-2 rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden
        >
          <Paperclip className="h-4 w-4" />
          <span>Drop your files here to attach them.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function showFileUploadDialog() {
  const input = document.createElement("input")

  input.type = "file"
  input.multiple = true
  input.accept = "*/*"
  input.click()

  return new Promise<File[] | null>((resolve) => {
    input.onchange = (e) => {
      const files = (e.currentTarget as HTMLInputElement).files

      if (files) {
        resolve(Array.from(files))
        return
      }

      resolve(null)
    }
  })
}

function TranscribingOverlay() {
  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <motion.div
          className="absolute inset-0 h-8 w-8 animate-pulse rounded-full bg-primary/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        Transcribing audio...
      </p>
    </motion.div>
  )
}

interface RecordingPromptProps {
  isVisible: boolean
  onStopRecording: () => void
}

function RecordingPrompt({ isVisible, onStopRecording }: RecordingPromptProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ top: 0, filter: "blur(5px)" }}
          animate={{
            top: -40,
            filter: "blur(0px)",
            transition: {
              type: "spring",
              filter: { type: "tween" },
            },
          }}
          exit={{ top: 0, filter: "blur(5px)" }}
          className="absolute left-1/2 flex -translate-x-1/2 cursor-pointer overflow-hidden whitespace-nowrap rounded-full border bg-background py-1 text-center text-sm text-muted-foreground"
          onClick={onStopRecording}
        >
          <span className="mx-2.5 flex items-center">
            <Info className="mr-2 h-3 w-3" />
            Click to finish recording
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface RecordingControlsProps {
  isRecording: boolean
  isTranscribing: boolean
  audioStream: MediaStream | null
  textAreaHeight: number
  onStopRecording: () => void
}

function RecordingControls({
  isRecording,
  isTranscribing,
  audioStream,
  textAreaHeight,
  onStopRecording,
}: RecordingControlsProps) {
  if (isRecording) {
    return (
      <div
        className="absolute inset-[1px] z-50 overflow-hidden rounded-xl"
        style={{ height: textAreaHeight - 2 }}
      >
        <AudioVisualizer
          stream={audioStream}
          isRecording={isRecording}
          onClick={onStopRecording}
        />
      </div>
    )
  }

  if (isTranscribing) {
    return (
      <div
        className="absolute inset-[1px] z-50 overflow-hidden rounded-xl"
        style={{ height: textAreaHeight - 2 }}
      >
        <TranscribingOverlay />
      </div>
    )
  }

  return null
}
