import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LunaAI/1.0; +https://example.com)",
      },
    })

    return NextResponse.json({
      requestedUrl: parsedUrl.toString(),
      resolvedUrl: response.url || parsedUrl.toString(),
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
    })
  } catch (error) {
    return NextResponse.json(
      {
        requestedUrl: parsedUrl.toString(),
        resolvedUrl: parsedUrl.toString(),
        error: error instanceof Error ? error.message : "Failed to resolve URL",
      },
      { status: 200 }
    )
  }
}
