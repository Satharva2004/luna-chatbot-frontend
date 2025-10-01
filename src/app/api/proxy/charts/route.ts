import { NextResponse } from 'next/server';

const CHARTS_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/charts`;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const auth = request.headers.get('Authorization') || '';

    let backendResponse: Response;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      backendResponse = await fetch(CHARTS_API_URL, {
        method: 'POST',
        headers: {
          Authorization: auth,
        },
        body: formData,
      });
    } else {
      const body = await request.json();
      backendResponse = await fetch(CHARTS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth,
        },
        body: JSON.stringify(body),
      });
    }

    const text = await backendResponse.text();
    const out = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();

    return NextResponse.json(out, { status: backendResponse.status });
  } catch (error: unknown) {
    console.error('Error in charts proxy:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { stack: error.stack } : {}),
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
