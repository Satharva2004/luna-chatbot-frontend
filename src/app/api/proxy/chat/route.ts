import { NextResponse } from 'next/server';

const CHAT_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/chat`;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const auth = request.headers.get('Authorization') || '';

    let backendResponse: Response;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      backendResponse = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          Authorization: auth,
        },
        body: formData,
      });
    } else {
      const body = await request.json();
      backendResponse = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth,
        },
        body: JSON.stringify({
          prompt: body.prompt,
          conversationId: body.conversationId || undefined,
        }),
      });
    }

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return NextResponse.json({ error: errorText }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();

    return NextResponse.json(
      {
        content: data.content || data.text || '',
        sources: Array.isArray(data.sources) ? data.sources : [],
        timestamp: data.timestamp || new Date().toISOString(),
        processingTime: typeof data.processingTime === 'number' ? data.processingTime : undefined,
        attempts: typeof data.attempts === 'number' ? data.attempts : undefined,
        conversationId: data.conversationId,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in chat proxy:', error);
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
