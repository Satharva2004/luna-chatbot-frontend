"use client"

import React from "react"
import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { Download, Maximize2, RefreshCcw, ZoomIn, ZoomOut } from "lucide-react"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ui/copy-button"

const MERMAID_SYNTAX_ERROR = "MERMAID_SYNTAX_ERROR"

type MermaidSyntaxError = Error & { details?: string }

function isMermaidErrorSvg(svg: string) {
  const lower = svg.toLowerCase()
  return (
    lower.includes('aria-roledescription="error"') ||
    lower.includes("aria-roledescription='error'") ||
    lower.includes('error-text') ||
    lower.includes('error-icon') ||
    lower.includes('syntax error in text')
  )
}

const MermaidDiagram = ({ code }: { code: string }) => {
  const canvasRef = React.useRef<HTMLDivElement | null>(null)
  const panzoomRef = React.useRef<any>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")
  const [svgMarkup, setSvgMarkup] = React.useState<string | null>(null)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const normalizedCode = React.useMemo(() => normalizeMermaidCode(code), [code])

  React.useEffect(() => {
    let cancelled = false

    async function renderMermaid() {
      if (!canvasRef.current) return

      setStatus("loading")
      setSvgMarkup(null)

      canvasRef.current.innerHTML = ""

      try {
        const [{ default: mermaid }, { default: panzoom }] = await Promise.all([
          import("mermaid"),
          import("panzoom"),
        ])

        if (cancelled || !canvasRef.current) return

        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" })

        const renderId = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const renderResult = await mermaid.render(renderId, normalizedCode)
        const svg = typeof renderResult === "string" ? renderResult : renderResult?.svg

        if (!svg) {
          throw new Error("Mermaid returned empty SVG")
        }

        // If Mermaid returned its own error SVG, do NOT render it.
        // Instead, treat this as an error state and show our own overlay only.
        if (isMermaidErrorSvg(svg)) {
          if (!cancelled) {
            if (canvasRef.current) {
              canvasRef.current.innerHTML = ""
            }
            setStatus("error")
          }
          return
        }

        if (cancelled || !canvasRef.current) return

        canvasRef.current.innerHTML = svg

        const svgElement = canvasRef.current.querySelector("svg")
        if (svgElement) {
          svgElement.removeAttribute("height")
          svgElement.removeAttribute("width")
          svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet")
          svgElement.style.width = "100%"
          svgElement.style.height = "auto"
          svgElement.classList.add("pointer-events-none", "select-none")
        }

        canvasRef.current
          .querySelectorAll(".error-icon, .error-text")
          .forEach((node) => node.remove())

        panzoomRef.current?.dispose()
        panzoomRef.current = panzoom(canvasRef.current, {
          maxZoom: 4,
          minZoom: 0.4,
          zoomDoubleClickSpeed: 1,
        })

        setSvgMarkup(svg)

        if (!cancelled) {
          setStatus("ready")
        }
      } catch (err) {
        if (!cancelled) {
          const details = err instanceof Error ? (err as MermaidSyntaxError).details : undefined
          console.error(
            "Mermaid render error",
            err,
            `\n--- Mermaid code begin ---\n${normalizedCode}\n--- Mermaid code end ---` +
              (details ? `\nDetails: ${details}` : "")
          )
          if (canvasRef.current) {
            canvasRef.current.innerHTML = ""
          }
          setStatus("error")
        }
      }
    }

    renderMermaid()

    return () => {
      cancelled = true
      panzoomRef.current?.dispose()
      panzoomRef.current = null
    }
  }, [normalizedCode])

  const interactable = status === "ready"

  const withCanvasCenter = (cb: (coords: { x: number; y: number }) => void) => {
    if (!canvasRef.current || !panzoomRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    cb({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }

  const handleZoom = (delta: number) => {
    if (!panzoomRef.current) return
    const currentScale = panzoomRef.current.getTransform().scale
    const nextScale = Math.min(4, Math.max(0.4, currentScale + delta))
    withCanvasCenter(({ x, y }) => panzoomRef.current.zoomAbs(x, y, nextScale))
  }

  const handleReset = () => {
    if (!panzoomRef.current) return
    panzoomRef.current.moveTo(0, 0)
    withCanvasCenter(({ x, y }) => panzoomRef.current.zoomAbs(x, y, 1))
  }

  const handleDownload = async (format: "svg" | "png") => {
    if (!svgMarkup) return

    if (format === "svg") {
      const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "diagram.svg"
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      return
    }

    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgMarkup, "image/svg+xml")
      const svgEl = doc.querySelector("svg")
      const viewBox = svgEl?.getAttribute("viewBox")
      let width = Number(svgEl?.getAttribute("width") || 0)
      let height = Number(svgEl?.getAttribute("height") || 0)

      if ((!width || !height) && viewBox) {
        const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number)
        width = vbWidth || 1200
        height = vbHeight || 800
      }

      if (!width || !height) {
        width = 1200
        height = 800
      }

      const image = new Image()
      const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      image.onload = () => {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(image, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob) return
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = "diagram.png"
          document.body.appendChild(link)
          link.click()
          link.remove()
          URL.revokeObjectURL(url)
        })
      }

      image.src = svgData
    } catch (downloadError) {
      console.warn("Failed to download Mermaid diagram", downloadError)
    }
  }

  const handleToggleExpand = () => {
    if (!svgMarkup) return
    setIsExpanded((prev) => !prev)
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span>Mermaid Diagram</span>
        <div className="flex flex-wrap gap-2">
          <ToolbarButton label="Zoom out" onClick={() => handleZoom(-0.25)} disabled={!interactable}>
            <ZoomOut className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Zoom in" onClick={() => handleZoom(0.25)} disabled={!interactable}>
            <ZoomIn className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Reset view" onClick={handleReset} disabled={!interactable}>
            <RefreshCcw className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label={isExpanded ? "Close expanded view" : "Expand"} onClick={handleToggleExpand} disabled={!svgMarkup}>
            <Maximize2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Download SVG" onClick={() => handleDownload("svg")} disabled={!svgMarkup}>
            <Download className="h-3.5 w-3.5" />
            <span className="ml-1 text-[0.65rem]">SVG</span>
          </ToolbarButton>
          <ToolbarButton label="Download PNG" onClick={() => handleDownload("png")} disabled={!svgMarkup}>
            <Download className="h-3.5 w-3.5" />
            <span className="ml-1 text-[0.65rem]">PNG</span>
          </ToolbarButton>
        </div>
      </div>

      <div className="relative min-h-[220px] overflow-hidden rounded-b-xl bg-muted/30">
        {status === "error" ? (
          <pre className="h-full w-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-muted-foreground">
            {normalizedCode}
          </pre>
        ) : (
          <>
            <div ref={canvasRef} className="h-full w-full p-4" />

            {status === "loading" && (
              <CanvasOverlay>
                <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
                  Rendering diagram…
                </span>
              </CanvasOverlay>
            )}
          </>
        )}
      </div>

      {isExpanded && svgMarkup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="relative h-full max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl bg-background p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="absolute right-4 top-4 rounded-full border border-border/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-muted"
            >
              Close
            </button>
            <div
              className="mt-6 w-full [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const CanvasOverlay = ({ children }: { children: React.ReactNode }) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
    {children}
  </div>
)

const ToolbarButton = ({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  label: string
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-background",
      disabled && "pointer-events-none opacity-40"
    )}
    aria-label={label}
    title={label}
  >
    {children}
  </button>
)

interface MarkdownRendererProps {
  children: string
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <div className="space-y-3">
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS as unknown as Components}>
        {children}
      </Markdown>
    </div>
  )
}

interface HighlightedPre extends React.HTMLAttributes<HTMLPreElement> {
  children: string
  language: string
}

const HighlightedPre = React.memo(
  ({ children, language, ...props }: HighlightedPre) => {
    const [highlighted, setHighlighted] = React.useState<React.ReactNode>(null)

    React.useEffect(() => {
      let cancelled = false

      async function highlight() {
        try {
          const { codeToTokens, bundledLanguages } = await import("shiki")

          if (cancelled) return

          if (!(language in bundledLanguages)) {
            setHighlighted(<pre {...props}>{children}</pre>)
            return
          }

          const { tokens } = await codeToTokens(children, {
            lang: language as keyof typeof bundledLanguages,
            defaultColor: false,
            themes: {
              light: "github-light",
              dark: "github-dark",
            },
          })

          if (cancelled) return

          setHighlighted(
            <pre {...props}>
              <code>
                {tokens.map((line, lineIndex) => (
                  <React.Fragment key={lineIndex}>
                    {line.map((token, tokenIndex) => (
                      <span key={tokenIndex} style={token.color ? { color: token.color } : {}}>
                        {token.content}
                      </span>
                    ))}
                    <br />
                  </React.Fragment>
                ))}
              </code>
            </pre>
          )
        } catch (error) {
          if (!cancelled) {
            setHighlighted(<pre {...props}>{children}</pre>)
          }
        }
      }

      highlight()

      return () => {
        cancelled = true
      }
    }, [children, language, props])

    return highlighted || <pre {...props}>{children}</pre>
  }
)

HighlightedPre.displayName = "HighlightedPre"

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode
  className?: string
  language: string
}

function CodeBlock({
  children,
  className,
  language,
  ...restProps
}: CodeBlockProps) {
  const code = childrenTakeAllStringContents(children)

  if (language === "mermaid") {
    const normalizedCode = normalizeMermaidCode(code)

    return (
      <div className="rounded-lg border border-border/60 bg-background/60 p-4">
        <MermaidDiagram code={normalizedCode} />
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">View Mermaid source</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-[0.75rem]">
            {normalizedCode}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton content={code} />
      </div>
      <HighlightedPre
        className={cn('p-4 rounded-md bg-muted overflow-x-auto', className)}
        language={language}
        {...restProps}
      >
        {code}
      </HighlightedPre>
    </div>
  )
}

type MermaidModule = (typeof import("mermaid"))["default"] & {
  parse?: (input: string) => void | Promise<unknown>
  mermaidAPI?: { parse?: (input: string) => void | Promise<unknown> }
}

async function validateMermaidCode(mermaidLib: MermaidModule, code: string) {
  const parser =
    typeof mermaidLib.parse === "function"
      ? mermaidLib.parse.bind(mermaidLib)
      : typeof mermaidLib.mermaidAPI?.parse === "function"
        ? mermaidLib.mermaidAPI.parse.bind(mermaidLib.mermaidAPI)
        : null

  if (!parser) {
    return null
  }

  try {
    const result = parser(code)
    if (result && typeof (result as Promise<unknown>).then === "function") {
      await result
    }
    return null
  } catch (error) {
    if (error instanceof Error) {
      return error.message
    }
    return "Unknown Mermaid syntax error"
  }
}

function normalizeMermaidCode(code: string) {
  return code
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .replace(/^graph\s+TD\b/i, 'flowchart TD')
    .replace(/^graph\s+LR\b/i, 'flowchart LR')
}

type NodeShapePattern = {
  open: string
  close: string
  regex: RegExp
}

const NODE_SHAPE_PATTERNS: NodeShapePattern[] = [
  { open: "[[", close: "]]", regex: /(\b[\w-]+)(\[\[[^\]]*\]\])/g },
  { open: "[", close: "]", regex: /(\b[\w-]+)(\[(?!\[)[^\]]*\])/g },
  { open: "{{", close: "}}", regex: /(\b[\w-]+)(\{\{[^}]*\}\})/g },
  { open: "{", close: "}", regex: /(\b[\w-]+)(\{(?!\{)[^}]*\})/g },
  { open: "((", close: "))", regex: /(\b[\w-]+)(\(\([^)]*\)\))/g },
  { open: "(", close: ")", regex: /(\b[\w-]+)(\((?!\()[^)]*\))/g },
  { open: ">", close: "]", regex: /(\b[\w-]+)(>[^\]]*\])/g },
]

const UNSAFE_LABEL_CHARS = /[()[\]{}<>#"'\\/|?:&]/

function sanitizeMermaidCode(code: string) {
  return code
    .split("\n")
    .map((line) => sanitizeMermaidLine(line))
    .join("\n")
}

function sanitizeMermaidLine(line: string) {
  let sanitized = line
  for (const pattern of NODE_SHAPE_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, (_, id: string, wrapper: string) => {
      const label = wrapper.slice(pattern.open.length, wrapper.length - pattern.close.length)
      const safeLabel = ensureQuotedLabel(label)
      return `${id}${pattern.open}${safeLabel}${pattern.close}`
    })
  }
  return sanitized
}

function ensureQuotedLabel(label: string) {
  const trimmed = label.trim()
  if (!trimmed) return trimmed
  const alreadyQuoted = trimmed.startsWith('"') && trimmed.endsWith('"')
  if (alreadyQuoted) {
    return trimmed
  }
  if (needsQuoting(trimmed)) {
    return `"${escapeDoubleQuotes(trimmed)}"`
  }
  return trimmed
}

function needsQuoting(label: string) {
  return UNSAFE_LABEL_CHARS.test(label) || label.includes("-->") || label.includes("<--")
}

function escapeDoubleQuotes(text: string) {
  return text.replace(/"/g, '\\"')
}

function childrenTakeAllStringContents(element: unknown): string {
  if (typeof element === 'string') return element
  if (Array.isArray(element)) return element.map(childrenTakeAllStringContents).join('')
  if (typeof element === 'object' && element !== null) {
    const maybe = element as { props?: { children?: unknown } }
    if (maybe.props && 'children' in maybe.props && maybe.props.children !== undefined) {
      return childrenTakeAllStringContents(maybe.props.children)
    }
  }
  return ''
}

const COMPONENTS = {
  h1: withClass("h1", "text-2xl font-semibold"),
  h2: withClass("h2", "font-semibold text-xl"),
  h3: withClass("h3", "font-semibold text-lg"),
  p: withClass("p", "leading-relaxed"),
  a: withClass("a", "text-primary underline underline-offset-4 hover:text-primary/80"),
  blockquote: withClass("blockquote", "border-l-4 border-muted-foreground/20 pl-4 text-muted-foreground"),
  
  code({ children, className, ...rest }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : ''
    
    if (language) {
      return (
        <CodeBlock language={language} className={className} {...rest}>
          {children}
        </CodeBlock>
      )
    }

    return (
      <code className={cn("rounded bg-muted px-1.5 py-0.5 text-sm font-mono", className)} {...rest}>
        {children}
      </code>
    )
  },
  
  pre({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  },
  
  ol: withClass("ol", "list-decimal space-y-2 pl-6"),
  ul: withClass("ul", "list-disc space-y-2 pl-6"),
  li: withClass("li", "my-1.5"),
  table: withClass(
    "table",
    "w-full border-collapse border border-border rounded-md overflow-hidden"
  ),
  thead: withClass("thead", "bg-muted"),
  tbody: withClass("tbody", "divide-y divide-border"),
  tr: withClass("tr", "hover:bg-muted/50"),
  th: withClass("th", "border border-border p-2 text-left font-medium"),
  td: withClass("td", "border border-border p-2"),
  hr: withClass("hr", "my-4 border-t border-border"),
  img: withClass("img", "rounded-md border border-border"),
}

function withClass<TagName extends keyof HTMLElementTagNameMap>(
  Tag: TagName,
  classes: string
) {
  return function Component({ className, ...props }: { className?: string } & React.HTMLAttributes<HTMLElement>) {
    return React.createElement(Tag, { className: cn(classes, className), ...props })
  }
}

export default MarkdownRenderer