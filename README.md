# frontend-v2

Luna AI frontend rebuilt with the [shadcn-fintech](https://github.com/abderrahimghazali/shadcn-fintech)
dashboard UI. Every feature from `../frontend` is carried over; the visual
system, shell and dashboard surfaces are ported from the fintech template.

## What came from the fintech template

- **Theme tokens** — the template's neutral `oklch` palette (light + dark) and
  its radius scale, in `src/app/globals.css`. Luna's own callout/resource tokens
  and keyframes are preserved alongside them.
- **Typography** — Geist Sans / Geist Mono, with a `--font-heading` token.
- **Shell** (`src/components/shell/`) — `AppSidebar` (inset variant, grouped
  nav, user dropdown footer), `DynamicBreadcrumb`, `ThemeToggle` (contrast
  icon), `CommandPalette` (⌘K), wired up in `src/app/(app)/layout.tsx` with the
  same header bar as the template.
- **Card system** — the template's `Card` (`ring-1 ring-foreground/10`, `size`
  variant, slot-driven header grid), plus `avatar`, `badge`, `breadcrumb` and
  `chart` primitives.

The template's components are Base UI based; they were re-implemented against
this project's existing Radix + `asChild` shadcn primitives so the rest of the
app keeps working unchanged.

## Routes

| Route | Notes |
| --- | --- |
| `/login`, `/signup` | Split-panel auth in the template's layout, real auth logic retained |
| `/dashboard` | Stat cards, research activity area chart, engagement score gauge, recent conversations, quick actions |
| `/chat` | Chat rebuilt in the template's system: conversations rail, thread card, composer footer; accepts `?c=<id>` and `?new=1` deep links |
| `/history` | Searchable conversation list with delete |
| `/analytics` | Stats, activity chart, chats-by-weekday bar chart, highlights |
| `/activity` | Grouped timeline of conversation events |
| `/settings` | Profile, default model, research tools, appearance |
| `/support` | FAQ, feedback dialog, keyboard shortcuts |

Everything under `src/app/(app)/`, chat included, is wrapped in
`ProtectedRoute` and the dashboard shell.

### The chat rewrite

`/chat` is a ChatGPT-shaped surface: one centred column, no second sidebar, no
card chrome. Its logic (streaming, attachments, transcription, excalidraw,
mermaid regeneration, search, rename/delete, key-health polling) is untouched;
the presentation is entirely new.

- **History lives in the main sidebar**, not inside the page. A shared
  `ConversationsProvider` (`src/contexts/conversations-context.tsx`) owns the
  list, the debounced server-side search and optimistic rename/delete; the
  sidebar and the chat page both read it, so they never drift.
- Conversations are bucketed **Today / Yesterday / Previous 7 days / Previous
  30 days / Older**, each row with a hover `...` menu for rename and delete.
- The sidebar footer carries **Dashboard, Settings, Help & Support** and the
  **profile** dropdown. Analytics and Activity were dropped from the nav.
- The thread shows an empty state with the composer centred and starter
  prompts below; once a thread starts, the composer pins to the bottom.
- Per-chat actions (new chat, export, profile, feedback) moved into a single
  `...` menu on the thread toolbar, alongside the model and key-health badges.

Sidebar and thread stay in sync over two window events —
`luna:conversation-opened` (highlights the active row) and
`luna:conversation-deleted` (resets the thread if the open chat is deleted).

### Redesigned chat internals

- **Thinking indicator** rebuilt as a quiet inline status line with stage chips,
  replacing the glass-morphism panel.
- **Streaming errors** no longer dump undici stacks into the transcript;
  `describeStreamError` maps them to one actionable sentence (backend
  unreachable, rate-limited, expired session, timeout).
- **Message bubbles and composer** moved off hardcoded hex colours onto theme
  tokens with the template's `ring-1 ring-foreground/10` treatment.
- **Justified body text removed** — `.luna-editorial p` was set to
  `text-align: justify`, which produced the ragged inter-word gaps in long
  answers. Now left-aligned.

All dashboard surfaces read real data through `src/hooks/use-luna-data.ts`
(`/api/proxy/stats` and `/api/proxy/conversations`); the activity series is
derived from conversation timestamps. No seed/mock data.

## Getting started

```bash
npm install
npm run dev
```

Copy `.env` settings from `../frontend` — `NEXT_PUBLIC_API_URL` must point at
the assignment backend.

## Added dependencies

`@radix-ui/react-avatar`, `recharts@3` — everything else matches `../frontend`.
