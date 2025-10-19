import { NextResponse } from 'next/server';

const CHAT_STREAM_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/chat/stream`;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const auth = request.headers.get('Authorization') || '';

    let backendResponse: Response;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      backendResponse = await fetch(CHAT_STREAM_API_URL, {
        method: 'POST',
        headers: {
          Authorization: auth,
        },
        body: formData,
      });
    } else {
      const body = await request.json();
      backendResponse = await fetch(CHAT_STREAM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth,
        },
        body: JSON.stringify({
          prompt: body.prompt,
          conversationId: body.conversationId || undefined,
          ...(body.options ? { options: body.options } : {}),
        }),
      });
    }

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return NextResponse.json({ error: errorText }, { status: backendResponse.status });
    }

    // Stream the response directly to the client
    return new NextResponse(backendResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error: unknown) {
    console.error('Error in chat stream proxy:', error);
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
