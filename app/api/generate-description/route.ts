import { NextRequest, NextResponse } from 'next/server'

const MAX_DESCRIPTION_LENGTH = 2000

export async function POST(request: NextRequest) {
  try {
    const { prompt, avatarName, personality } = await request.json()

    const userPrompt = typeof prompt === 'string' && prompt.trim().length > 0
      ? prompt.trim()
      : 'avatar educativo, tutor generico'

    const apiKey = process.env.OPENAI_API_KEY?.trim()

    if (apiKey) {
      try {
        const systemContent = `Sei un assistente che crea descrizioni e backstory professionali per avatar educativi (tutor, docenti virtuali). 
Scrivi in modo chiaro e strutturato, in italiano. 
Includi: competenze, ambito di conoscenza, stile di insegnamento e tratti distintivi.
Rispondi SOLO con il testo della backstory, senza titoli tipo "Ecco la descrizione" o prefissi. Massimo ${MAX_DESCRIPTION_LENGTH} caratteri.`

        const userContent = avatarName
          ? `Crea la backstory per un avatar educativo di nome "${avatarName}". Contesto/tema: ${userPrompt}.`
          : `Crea la backstory per un avatar educativo. Contesto/tema: ${userPrompt}.`

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemContent },
              { role: 'user', content: userContent },
            ],
            temperature: 0.7,
            max_tokens: 800,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err as { error?: { message?: string } })?.error?.message || `OpenAI ${res.status}`)
        }

        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
        const content = data.choices?.[0]?.message?.content?.trim()
        if (content) {
          const description = content.slice(0, MAX_DESCRIPTION_LENGTH)
          return NextResponse.json({ description, success: true })
        }
      } catch (openAiErr) {
        console.warn('[generate-description] OpenAI error:', openAiErr)
        // Fallback a mock sotto
      }
    }

    // Fallback mock se OPENAI_API_KEY assente o errore
    const mockDescription = `**Background e competenze**
${avatarName ? `${avatarName} è` : 'Questo avatar è'} un tutor esperto nel proprio ambito. ${userPrompt}.

**Stile e approccio**
Competenze avanzate nella materia, capacità di adattare le lezioni a diversi stili di apprendimento e di rendere i concetti accessibili.

**Ambito di conoscenza**
${userPrompt}.

Imposta OPENAI_API_KEY in .env.local o Netlify per generare la backstory con GPT.`

    return NextResponse.json({
      description: mockDescription.slice(0, MAX_DESCRIPTION_LENGTH),
      success: true,
      placeholder: true,
    })
  } catch (error) {
    console.error('Error generating description:', error)
    return NextResponse.json(
      { error: 'Errore nella generazione della descrizione' },
      { status: 500 }
    )
  }
}
