import { NextResponse } from 'next/server';

interface GroundingChunk {
  web?: {
    uri: string;
  };
}

const GEMINI_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/generate`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Generate Request:', JSON.stringify(body, null, 2));
    //trial commit
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || ''
      },
      body: JSON.stringify({
        prompt: body.prompt,
        userId: body.userId || 'anonymous'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    let result: { content: string; sources: string[] } = { content: '', sources: [] };
    
    // Handle both direct response and array response from Gemini
    if (Array.isArray(responseData) && responseData.length > 0) {
      // If it's an array, take the first candidate's content
      const candidate = responseData[0] as {
        candidates?: Array<{
          content: { parts: Array<{ text: string }> };
          groundingMetadata?: { groundingChunks?: GroundingChunk[] };
        }>;
      };
      
      if (candidate.candidates?.[0]?.content?.parts?.[0]?.text) {
        result = {
          content: candidate.candidates[0].content.parts[0].text,
          sources: candidate.candidates[0]?.groundingMetadata?.groundingChunks
            ?.map((c) => c.web?.uri)
            .filter((uri): uri is string => Boolean(uri)) || []
        };
      }
    } else if (typeof responseData === 'object' && responseData !== null) {
      // Handle direct response
      result = {
        content: (responseData as any).content || '',
        sources: Array.isArray((responseData as any).sources) 
          ? (responseData as any).sources 
          : []
      };
    }
    
    console.log('Gemini Response:', JSON.stringify({
      content: result.content ? `${result.content.substring(0, 100)}...` : 'No content',
      sources: result.sources || []
    }, null, 2));
    
    return NextResponse.json({
      content: responseData.content || 'No response from model',
      sources: responseData.sources || [],
      timestamp: responseData.timestamp || new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error: unknown) {
    console.error('Error in generate proxy:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { stack: error.stack } : {})
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS method for CORS preflight
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
