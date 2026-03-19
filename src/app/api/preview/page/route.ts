import { NextRequest, NextResponse } from "next/server"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function absolutizeAssetUrls(html: string, resolvedUrl: string) {
  const base = new URL(resolvedUrl)

  return html.replace(
    /\b(href|src)=["'](?![a-z]+:|\/\/|#|data:|mailto:|tel:)([^"']+)["']/gi,
    (_match, attr: string, value: string) => {
      try {
        const absolute = new URL(value, base).toString()
        return `${attr}="${absolute}"`
      } catch {
        return `${attr}="${value}"`
      }
    }
  )
}

function sanitizeHtmlDocument(html: string, resolvedUrl: string) {
  const withoutScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "")
    .replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, "")

  const withAbsoluteAssets = absolutizeAssetUrls(withoutScripts, resolvedUrl)
  const headInjection = `
    <base href="${escapeHtml(resolvedUrl)}" />
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      body { color: #111827; font-family: Inter, Arial, sans-serif; line-height: 1.6; padding: 24px; }
      img, video, iframe { max-width: 100%; height: auto; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; }
      a { color: #2563eb; }
    </style>
  `

  if (/<head[^>]*>/i.test(withAbsoluteAssets)) {
    return withAbsoluteAssets.replace(/<head([^>]*)>/i, `<head$1>${headInjection}`)
  }

  return `<!doctype html><html><head>${headInjection}</head><body>${withAbsoluteAssets}</body></html>`
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")

  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return new NextResponse("Invalid URL", { status: 400 })
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LunaAI/1.0; +https://example.com)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    })

    const contentType = response.headers.get("content-type") || ""
    const resolvedUrl = response.url || parsedUrl.toString()

    if (!response.ok) {
      return new NextResponse(`Failed to load preview (${response.status})`, { status: 502 })
    }

    if (!/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
      return NextResponse.redirect(resolvedUrl)
    }

    const html = await response.text()
    const sanitized = sanitizeHtmlDocument(html, resolvedUrl)

    return new NextResponse(sanitized, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load preview"
    return new NextResponse(
      `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:24px"><h2>Preview unavailable</h2><p>${escapeHtml(message)}</p></body></html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    )
  }
}
