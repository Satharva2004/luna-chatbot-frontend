/**
 * Mermaid repair pipeline.
 *
 * Models emit Mermaid that is *nearly* right far more often than it is exactly
 * right, and a single bad character fails the whole diagram. Rather than one
 * sanitiser that either works or doesn't, this module exposes a set of small,
 * independent rules plus a progressive escalation strategy:
 *
 *   tier 0  the code exactly as written (never break something already valid)
 *   tier 1  lossless normalisation (entities, smart quotes, fences, arrows)
 *   tier 2  structural quoting (labels and subgraph titles)
 *   tier 3  aggressive rewrites (reserved ids, bracket balancing, text stripping)
 *
 * The caller validates each candidate against the real parser and stops at the
 * first one that parses, so the least invasive fix always wins. Anything still
 * broken after tier 3 is handed to a model repair pass by the caller.
 */

/** Characters that force a Mermaid label to be quoted. */
const UNSAFE_LABEL_CHARS = /[()[\]{}<>#"'\\/|?:&;,!@$%^*+=~`]/

/** Node shapes Mermaid understands, longest delimiters first so `[[` wins over `[`. */
const NODE_SHAPES: { open: string; close: string; regex: RegExp }[] = [
  { open: "[[", close: "]]", regex: /(\b[\w-]+)(\[\[[^\]]*\]\])/g },
  { open: "([", close: "])", regex: /(\b[\w-]+)(\(\[[^\]]*\]\))/g },
  { open: "[(", close: ")]", regex: /(\b[\w-]+)(\[\([^)]*\)\])/g },
  { open: "((", close: "))", regex: /(\b[\w-]+)(\(\([^)]*\)\))/g },
  { open: "{{", close: "}}", regex: /(\b[\w-]+)(\{\{[^}]*\}\})/g },
  { open: "[", close: "]", regex: /(\b[\w-]+)(\[(?!\[|\()[^\]]*\])/g },
  { open: "(", close: ")", regex: /(\b[\w-]+)(\((?!\(|\[)[^)]*\))/g },
  { open: "{", close: "}", regex: /(\b[\w-]+)(\{(?!\{)[^}]*\})/g },
  { open: ">", close: "]", regex: /(\b[\w-]+)(>[^\]]*\])/g },
]

/** Words Mermaid's grammar reserves; using one as a node id is a parse error. */
const RESERVED_IDS = new Set([
  "graph",
  "subgraph",
  "end",
  "class",
  "classdef",
  "click",
  "style",
  "linkstyle",
  "direction",
  "flowchart",
  "o",
  "x",
])

const DIAGRAM_HEADER =
  /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|gitGraph|C4Context|requirementDiagram|sankey(-beta)?|xychart(-beta)?|block(-beta)?)\b/i

const ARROW = /(-{2,3}>|={2,3}>|-\.->|-{2,3}|\.->|~~~|--[ox]|==[ox])/

// ── tier 1: lossless normalisation ──────────────────────────────────────────

/** Strips a markdown fence the model wrapped around the diagram. */
export function stripFence(code: string): string {
  return code
    .replace(/^\s*```(?:mermaid)?[ \t]*\r?\n?/i, "")
    .replace(/\r?\n?\s*```\s*$/i, "")
    .replace(/^mermaid\s*\r?\n/i, "")
    .trim()
}

/** HTML entities routinely survive the model's markdown and break the parser. */
export function decodeEntities(code: string): string {
  const named: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&#x27;": "'",
    "&mdash;": "-",
    "&ndash;": "-",
    "&hellip;": "...",
  }
  return code
    .replace(/&[a-z]+;|&#x?[0-9a-f]+;/gi, (m) => named[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

export function normalize(code: string): string {
  return decodeEntities(code)
    .replace(/﻿/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/ /g, " ")
    .replace(/​/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** `graph TD` still parses, but `flowchart` is the maintained grammar. */
export function modernizeHeader(code: string): string {
  return code.replace(/^\s*graph\s+(TD|TB|LR|RL|BT)\b/i, "flowchart $1")
}

/** Mermaid accepts `<br/>` but chokes on bare `<br>` inside quoted labels. */
export function normalizeLineBreaks(code: string): string {
  return code.replace(/<br\s*>/gi, "<br/>")
}

/** Trailing semicolons are legal in old `graph` syntax but noisy and error-prone. */
export function dropTrailingSemicolons(code: string): string {
  return code.replace(/;\s*$/gm, "")
}

/** `End` / `END` closing a subgraph is a parse error; only lowercase `end` works. */
export function normalizeEndKeyword(code: string): string {
  return code.replace(/^(\s*)(End|END)\s*$/gm, "$1end")
}

/** Collapses odd spacing around arrows so the link grammar matches. */
export function normalizeArrows(code: string): string {
  return code.replace(
    new RegExp(`\\s*${ARROW.source}\\s*`, "g"),
    (m, arrow) => ` ${arrow} `
  )
}

// ── tier 2: structural quoting ──────────────────────────────────────────────

export function needsQuoting(label: string): boolean {
  const trimmed = label.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return false
  return UNSAFE_LABEL_CHARS.test(trimmed) || /\b(end|graph|class)\b/i.test(trimmed)
}

function quoteLabel(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed
  if (!needsQuoting(trimmed)) return trimmed
  return `"${trimmed.replace(/"/g, "'")}"`
}

/**
 * A bare `subgraph` title may only contain safe characters. Titles like
 * `Encoder Stack (N times)` fail with "got 'PS'". Rewrite to `id["title"]`,
 * which every Mermaid version accepts.
 */
export function quoteSubgraphTitles(code: string): string {
  let counter = 0
  return code
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*)subgraph\s+(.+?)\s*$/i)
      if (!match) return line
      const [, indent, rest] = match
      if (rest.startsWith('"')) return line
      // Already `id[...]` / `id("...")`: the node-shape pass handles the label.
      if (/^[\w-]+\s*[[({]/.test(rest)) return line
      if (!needsQuoting(rest)) return line
      counter += 1
      return `${indent}subgraph sg${counter}["${rest.replace(/"/g, "'")}"]`
    })
    .join("\n")
}

/** Quotes node labels containing characters the grammar would otherwise eat. */
export function quoteNodeLabels(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      if (/^\s*subgraph\s/i.test(line)) return line
      let out = line
      for (const shape of NODE_SHAPES) {
        out = out.replace(shape.regex, (_m, id: string, wrapper: string) => {
          const label = wrapper.slice(
            shape.open.length,
            wrapper.length - shape.close.length
          )
          return `${id}${shape.open}${quoteLabel(label)}${shape.close}`
        })
      }
      return out
    })
    .join("\n")
}

/** Markdown emphasis inside a label is rendered literally at best, fatal at worst. */
export function stripMarkdownInLabels(code: string): string {
  return code.replace(/"([^"]*)"/g, (_m, inner: string) =>
    `"${inner.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1").replace(/`/g, "")}"`
  )
}

// ── tier 3: aggressive rewrites ─────────────────────────────────────────────

/** Renames node ids that collide with grammar keywords (`end --> x`). */
export function renameReservedIds(code: string): string {
  const renamed = new Map<string, string>()

  const lines = code.split("\n").map((line) => {
    if (/^\s*(subgraph|direction|click|style|classDef|class)\b/i.test(line)) return line

    return line.replace(/(^|\s)([A-Za-z_][\w-]*)(?=\s*(\[|\(|\{|>|-{2,3}|={2,3}|\.|$))/g,
      (match, lead: string, id: string) => {
        if (!RESERVED_IDS.has(id.toLowerCase())) return match
        if (/^\s*end\s*$/i.test(line)) return match
        const safe = renamed.get(id) ?? `${id}_node`
        renamed.set(id, safe)
        return `${lead}${safe}`
      }
    )
  })

  return lines.join("\n")
}

/** Adds a diagram header when the model emitted only the body. */
export function ensureHeader(code: string): string {
  const firstMeaningful = code.split("\n").find((l) => l.trim() && !l.trim().startsWith("%%"))
  if (firstMeaningful && DIAGRAM_HEADER.test(firstMeaningful)) return code
  return `flowchart TD\n${code}`
}

/** Drops lines that are prose rather than diagram syntax. */
export function dropProseLines(code: string): string {
  const lines = code.split("\n")
  const header = lines.findIndex((l) => DIAGRAM_HEADER.test(l))

  return lines
    .filter((line, i) => {
      if (i <= header) return true
      const t = line.trim()
      if (!t || t.startsWith("%%")) return true
      if (/^(subgraph|end|direction|click|style|classDef|class|linkStyle)\b/i.test(t)) return true
      // A diagram line has either a link or a node shape in it.
      return ARROW.test(t) || /[[({>]/.test(t)
    })
    .join("\n")
}

// ── escalation ──────────────────────────────────────────────────────────────

const TIER_1 = (c: string) =>
  normalizeEndKeyword(
    dropTrailingSemicolons(normalizeLineBreaks(modernizeHeader(normalize(stripFence(c)))))
  )

const TIER_2 = (c: string) => stripMarkdownInLabels(quoteNodeLabels(quoteSubgraphTitles(TIER_1(c))))

const TIER_3 = (c: string) => dropProseLines(ensureHeader(renameReservedIds(TIER_2(c))))

/**
 * Candidate repairs, least invasive first. The caller parses each in order and
 * keeps the first that validates, so valid input is never rewritten.
 */
export function buildRepairCandidates(code: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  for (const candidate of [
    code.trim(),
    stripFence(code),
    TIER_1(code),
    normalizeArrows(TIER_1(code)),
    TIER_2(code),
    normalizeArrows(TIER_2(code)),
    TIER_3(code),
  ]) {
    const cleaned = candidate?.trim()
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned)
      out.push(cleaned)
    }
  }

  return out
}

/** Prompt used for the model repair pass when every deterministic tier fails. */
export function buildRepairPrompt(code: string, error: string): string {
  return [
    "You are fixing a broken Mermaid diagram.",
    "",
    "Return ONLY the corrected Mermaid source. No prose, no markdown fence, no explanation.",
    "Preserve the original structure, node ids, labels and intent exactly.",
    "Change only what is required to make it parse.",
    "Quote any label containing punctuation. Subgraph titles must use the form: subgraph id[\"Title\"].",
    "",
    `Parser error: ${error}`,
    "",
    "Broken diagram:",
    code,
  ].join("\n")
}
