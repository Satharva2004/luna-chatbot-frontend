import { NextResponse } from 'next/server';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  sources: string[];
  created_at: string;
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = request.headers.get('Authorization') || '';
    const { id } = params;

    const resp = await fetch(GET_CONVERSATION_URL(id), {
      method: 'DELETE',
      headers: {
        Authorization: auth,
      },
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return NextResponse.json({ error: errorText }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

interface ConversationResponse {
  id: string;
  title: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

const GET_CONVERSATION_URL = (id: string) => `${process.env.NEXT_PUBLIC_API_URL}/api/gemini/conversations/${id}`;

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    try {
      const auth = request.headers.get('Authorization') || '';
      const { id } = await Promise.resolve(params); // Await the params

      // Use the same URL pattern as DELETE function
      const response = await fetch(GET_CONVERSATION_URL(id), {
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error: error || 'Failed to fetch conversation' }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error in conversation API route:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
