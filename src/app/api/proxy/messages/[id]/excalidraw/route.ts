import { NextResponse } from 'next/server';

const MSG_URL = (id: string) => `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/messages/${id}/excalidraw`;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = request.headers.get('Authorization') || '';
    const { id } = params;
    const body = await request.json();
    const resp = await fetch(MSG_URL(id), {
      method: 'PATCH',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ error: 'Failed to update diagram' }, { status: 500 });
  }
}
