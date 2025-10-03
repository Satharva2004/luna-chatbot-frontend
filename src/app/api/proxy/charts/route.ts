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

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error('Error in charts proxy:', error);
    return NextResponse.json(
      { error: 'Failed to process chart generation request' },
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