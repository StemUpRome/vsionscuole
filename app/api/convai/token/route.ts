import { NextResponse } from 'next/server';

/**
 * Restituisce l'API key Convai per il client.
 * La chiave resta solo su server (process.env.CONVAI_API_KEY) e viene
 * inviata al client solo su richiesta (es. dopo login o per sessione).
 */
export async function GET() {
  const apiKey = process.env.CONVAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'CONVAI_API_KEY non configurata. Aggiungila in .env.local.' },
      { status: 503 }
    );
  }
  return NextResponse.json({ apiKey });
}
