import { NextResponse } from 'next/server';

const EXCALIDRAW_GENERATE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/excalidraw/generate`;

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('Authorization') || '';
    const body = await request.json();

    const backendResponse = await fetch(EXCALIDRAW_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error('Error in excalidraw generate proxy:', error);
    return NextResponse.json(
      { error: 'Failed to process flowchart generation request' },
      { status: 500 }
    );
  }
}
