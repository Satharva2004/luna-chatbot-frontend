import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('Authorization') || '';
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/chat/search?q=${encodeURIComponent(q)}`,
      {
        headers: { Authorization: auth },
      }
    );

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
