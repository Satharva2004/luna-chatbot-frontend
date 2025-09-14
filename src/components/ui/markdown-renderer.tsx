"use client"

import React, { Suspense } from "react"
import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ui/copy-button"

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
  async ({ children, language, ...props }: HighlightedPre) => {
    const { codeToTokens, bundledLanguages } = await import("shiki")

    if (!(language in bundledLanguages)) {
      return <pre {...props}>{children}</pre>
    }

    const { tokens } = await codeToTokens(children, {
      lang: language as keyof typeof bundledLanguages,
      defaultColor: false,
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    })

    return (
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

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton content={code} />
      </div>
      <Suspense fallback={<pre {...restProps} className={cn(className, 'p-4 rounded-md bg-muted')}>
        <code>{code}</code>
      </pre>}>
        <HighlightedPre
          className={cn('p-4 rounded-md bg-muted overflow-x-auto', className)}
          language={language}
          {...restProps}
        >
          {code}
        </HighlightedPre>
      </Suspense>
    </div>
  )
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