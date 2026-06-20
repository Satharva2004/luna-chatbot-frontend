import { NextResponse } from 'next/server';

const SUGGESTIONS_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/suggestions`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resp = await fetch(SUGGESTIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
