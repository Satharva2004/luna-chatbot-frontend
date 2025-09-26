import { NextResponse } from 'next/server';

const LIST_CONVERSATIONS_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/conversations`;

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('Authorization') || '';

    const resp = await fetch(LIST_CONVERSATIONS_URL, {
      method: 'GET',
      headers: {
        Authorization: auth,
      },
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return NextResponse.json({ error: errorText }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
