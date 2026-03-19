# LunaAI Frontend

Elegant chat UI built with Next.js, React, and Tailwind CSS.

## Stack

- Next.js 15
- React 19
- Tailwind CSS
- Framer Motion
- Radix UI

## Features

- Chat interface with streaming responses
- Source previews inside the app
- History sidebar
- Rich markdown rendering
- Image, video, chart, and file response blocks

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment

Create a `.env` file in `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Folder

```text
src/app        pages and routes
src/components shared UI
src/contexts   app context
src/services   client helpers
```

## Notes

The frontend talks to the Express backend for chat, auth, history, uploads, charts, and preview routing.
