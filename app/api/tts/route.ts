import { NextRequest, NextResponse } from 'next/server';

const VOICES = ['alloy', 'nova', 'onyx', 'shimmer', 'echo', 'fable'] as const;
type Voice = (typeof VOICES)[number];

function isValidVoice(v: unknown): v is Voice {
  return typeof v === 'string' && VOICES.includes(v as Voice);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const voice = isValidVoice(body?.voice) ? body.voice : 'nova';

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        response_format: 'mp3',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[TTS API] OpenAI error:', res.status, err);
      return NextResponse.json(
        { error: 'TTS request failed', details: err },
        { status: res.status }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[TTS API] Error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'TTS error' },
      { status: 500 }
    );
  }
}
