import { NextResponse } from 'next/server';

const STATS_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/stats`;

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('Authorization') || '';
    const resp = await fetch(STATS_URL, { headers: { Authorization: auth } });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
