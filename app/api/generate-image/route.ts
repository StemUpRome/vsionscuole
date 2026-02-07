import { NextRequest, NextResponse } from 'next/server'

/**
 * Genera un'immagine per l'avatar da un prompt.
 * Se OPENAI_API_KEY è impostata, usa DALL-E 3 (opzionale).
 * Altrimenti restituisce un'immagine placeholder SVG con il prompt.
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Il prompt è richiesto' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (apiKey?.trim()) {
      try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt.trim().slice(0, 1000),
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json',
            quality: 'standard',
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err as { error?: { message?: string } })?.error?.message || `OpenAI ${res.status}`)
        }

        const data = (await res.json()) as { data?: { b64_json?: string }[] }
        const b64 = data.data?.[0]?.b64_json
        if (b64) {
          return NextResponse.json({
            imageUrl: `data:image/png;base64,${b64}`,
            success: true,
          })
        }
      } catch (openAiError) {
        console.warn('[generate-image] OpenAI fallback:', openAiError)
        // Continua con placeholder sotto
      }
    }

    // Placeholder: immagine SVG con gradiente e testo del prompt (per preview senza API)
    const escaped = escapeXml(prompt.trim().slice(0, 80))
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4C1D95"/>
      <stop offset="100%" style="stop-color:#1E1B4B"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#bg)"/>
  <text x="200" y="280" font-family="system-ui,sans-serif" font-size="14" fill="#C4B5FD" text-anchor="middle" width="360">${escaped}</text>
  <text x="200" y="320" font-family="system-ui,sans-serif" font-size="12" fill="#8B5CF6" text-anchor="middle" opacity="0.8">Genera con OpenAI (DALL-E) per un ritratto reale.</text>
  <text x="200" y="550" font-family="system-ui,sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Imposta OPENAI_API_KEY in .env per DALL-E</text>
</svg>`
    const base64 = Buffer.from(svg).toString('base64')
    const imageUrl = `data:image/svg+xml;base64,${base64}`

    return NextResponse.json({
      imageUrl,
      success: true,
      placeholder: true,
    })
  } catch (error) {
    console.error('[generate-image]', error)
    return NextResponse.json(
      { error: 'Errore nella generazione dell\'immagine' },
      { status: 500 }
    )
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
