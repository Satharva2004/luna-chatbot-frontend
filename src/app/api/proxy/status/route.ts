import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/status`);
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
