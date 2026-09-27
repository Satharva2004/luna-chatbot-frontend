import { NextResponse } from 'next/server';
import { buildRepairPrompt } from '@/lib/mermaid-sanitizer';

const GENERATE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/generate`;

/**
 * Last-resort Mermaid repair. The client only calls this once every
 * deterministic repair tier has failed to parse, so it runs rarely.
 */
export async function POST(request: Request) {
  try {
    const { code, error } = await request.json();

    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Missing diagram code' }, { status: 400 });
    }

    const resp = await fetch(GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        prompt: buildRepairPrompt(code, String(error || 'unknown parse error')),
        userId: 'mermaid-repair',
      }),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Repair upstream returned ${resp.status}` },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const raw =
      (typeof data?.text === 'string' && data.text) ||
      (typeof data?.response === 'string' && data.response) ||
      (typeof data?.content === 'string' && data.content) ||
      (typeof data?.data?.text === 'string' && data.data.text) ||
      '';

    if (!raw.trim()) {
      return NextResponse.json({ error: 'Repair returned nothing' }, { status: 502 });
    }

    // The model is told not to fence its answer, but strip one if it does.
    const repaired = raw
      .replace(/^\s*```(?:mermaid)?\s*\n?/i, '')
      .replace(/\n?\s*```\s*$/i, '')
      .trim();

    return NextResponse.json({ code: repaired }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Repair failed' },
      { status: 500 }
    );
  }
}
