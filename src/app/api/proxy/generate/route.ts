import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Proxy Request Body:', JSON.stringify(body, null, 2));
    
    const response = await fetch('https://assignment-backend-one-khaki.vercel.app/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response Data:', JSON.stringify({
      content: data.content ? `${data.content.substring(0, 100)}...` : 'No content',
      sources: data.sources ? `Array(${data.sources.length})` : 'No sources',
      timestamp: data.timestamp || 'No timestamp'
    }, null, 2));
    
    // Make sure sources are included in the response
    const responseData = {
      content: data.content,
      sources: Array.isArray(data.sources) ? data.sources : [],
      timestamp: data.timestamp || new Date().toISOString()
    };
    
    console.log('Proxy Response Data:', JSON.stringify({
      content: responseData.content ? `${responseData.content.substring(0, 100)}...` : 'No content',
      sources: `Array(${responseData.sources.length})`,
      timestamp: responseData.timestamp
    }, null, 2));
    
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS method for CORS preflight
// Handle OPTIONS method for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
