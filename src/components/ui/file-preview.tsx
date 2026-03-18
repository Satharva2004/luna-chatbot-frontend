"use client"

import React, { useEffect } from "react"
import { motion } from "framer-motion"
import { FileIcon, X, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CustomPDFViewer } from "@/components/ui/pdf-viewer"

interface FilePreviewProps {
  file: File
  onRemove?: () => void
}

export const FilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  (props, ref) => {
    if (props.file.type.startsWith("image/")) {
      return <ImageFilePreview {...props} ref={ref} />
    }

    if (
      props.file.type.startsWith("text/") ||
      props.file.name.endsWith(".txt") ||
      props.file.name.endsWith(".md")
    ) {
      return <TextFilePreview {...props} ref={ref} />
    }

    if (props.file.type === "application/pdf") {
      return <PDFFilePreview {...props} ref={ref} />
    }

    return <GenericFilePreview {...props} ref={ref} />
  }
)
FilePreview.displayName = "FilePreview"

const PDFFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove }, ref) => {
    const [url, setUrl] = React.useState<string>("")

    useEffect(() => {
      const objectUrl = URL.createObjectURL(file)
      setUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }, [file])

    return (
      <Dialog>
        <DialogTrigger asChild>
          <motion.div
            ref={ref}
            className="relative flex max-w-[200px] cursor-pointer rounded-md border p-1.5 pr-2 text-xs bg-red-500/5 border-red-500/20 hover:bg-red-500/10 transition-colors group"
            layout
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            <div className="flex w-full items-center space-x-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                <div className="text-[10px] font-bold text-red-600 dark:text-red-400">PDF</div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="w-full truncate text-muted-foreground font-medium">
                  {file.name}
                </span>
                <span className="text-[10px] text-red-500/60 font-medium flex items-center gap-1">
                  <Eye className="h-2.5 w-2.5" />
                  Click to view
                </span>
              </div>
            </div>

            {onRemove ? (
              <button
                className="absolute -right-2 -top-2 z-30 flex h-4 w-4 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted"
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onRemove()
                }}
                aria-label="Remove attachment"
              >
                <X className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            ) : null}
          </motion.div>
        </DialogTrigger>
        <DialogContent size="fullscreen" className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{file.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 flex-col h-[80vh]">
            {url && <CustomPDFViewer url={url} height="100%" />}
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)
PDFFilePreview.displayName = "PDFFilePreview"

const ImageFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove }, ref) => {
    return (
      <motion.div
        ref={ref}
        className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
        layout
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        <div className="flex w-full items-center space-x-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`Attachment ${file.name}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted object-cover"
            src={URL.createObjectURL(file)}
          />
          <span className="w-full truncate text-muted-foreground">
            {file.name}
          </span>
        </div>

        {onRemove ? (
          <button
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </motion.div>
    )
  }
)
ImageFilePreview.displayName = "ImageFilePreview"

const TextFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove }, ref) => {
    const [preview, setPreview] = React.useState<string>("")

    useEffect(() => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        setPreview(text.slice(0, 50) + (text.length > 50 ? "..." : ""))
      }
      reader.readAsText(file)
    }, [file])

    return (
      <motion.div
        ref={ref}
        className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
        layout
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        <div className="flex w-full items-center space-x-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted p-0.5">
            <div className="h-full w-full overflow-hidden text-[6px] leading-none text-muted-foreground">
              {preview || "Loading..."}
            </div>
          </div>
          <span className="w-full truncate text-muted-foreground">
            {file.name}
          </span>
        </div>

        {onRemove ? (
          <button
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </motion.div>
    )
  }
)
TextFilePreview.displayName = "TextFilePreview"

const GenericFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove }, ref) => {
    return (
      <motion.div
        ref={ref}
        className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
        layout
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        <div className="flex w-full items-center space-x-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted">
            <FileIcon className="h-6 w-6 text-foreground" />
          </div>
          <span className="w-full truncate text-muted-foreground">
            {file.name}
          </span>
        </div>

        {onRemove ? (
          <button
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </motion.div>
    )
  }
)
GenericFilePreview.displayName = "GenericFilePreview"
