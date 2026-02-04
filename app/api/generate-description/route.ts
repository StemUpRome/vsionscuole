import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, avatarName, personality } = await request.json()

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Il prompt è richiesto' },
        { status: 400 }
      )
    }

    // TODO: Sostituire con chiamata reale a OpenAI o altro provider AI
    // Per ora, generiamo una risposta mock basata sul prompt
    
    // In produzione, qui fareste:
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4',
    //     messages: [
    //       {
    //         role: 'system',
    //         content: 'Sei un assistente che crea descrizioni professionali per avatar educativi...'
    //       },
    //       {
    //         role: 'user',
    //         content: `Crea una backstory per un avatar educativo: ${prompt}...`
    //       }
    //     ],
    //     temperature: 0.7,
    //   }),
    // })

    // Simulazione di generazione AI con delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Mock response - in produzione verrà sostituita con la risposta reale dell'AI
    const mockDescription = `**Background Professionale**
${avatarName ? `Il docente ${avatarName} è` : 'Questo docente è'} un esperto nel proprio campo con anni di esperienza dedicati all'insegnamento e alla formazione. ${prompt.includes('scienze') || prompt.includes('matematica') ? 'Specializzato in materie scientifiche, possiede una solida base teorica unita a competenze pratiche.' : ''}${prompt.includes('lettere') || prompt.includes('italiano') ? 'Esperto in letteratura e comunicazione, appassionato di linguistica e didattica della lingua.' : ''}

**Esperienza e Competenze**
- Formazione accademica di alto livello
- Esperienza pluriennale nell'insegnamento a studenti di diverse età
- Competenze avanzate nella materia di specializzazione
- Capacità di adattare le lezioni a diversi stili di apprendimento

**Stile di Insegnamento**
Lo stile di insegnamento si caratterizza per un approccio ${personality?.extraversion > 60 ? 'dinamico e coinvolgente' : personality?.extraversion < 40 ? 'riflessivo e metodico' : 'bilanciato'}, con particolare attenzione alla ${personality?.conscientiousness > 60 ? 'precisione e al dettaglio' : 'creatività e all\'innovazione'}. L'insegnante crea un ambiente ${personality?.agreeableness > 60 ? 'accogliente e collaborativo' : 'stimolante e orientato ai risultati'}.

**Approccio Pedagogico**
${personality?.openness > 60 ? 'Aperto alle nuove metodologie didattiche e tecnologie educative, incoraggia il pensiero critico e la creatività.' : 'Basato su metodologie consolidate, con focus sulla comprensione approfondita dei concetti fondamentali.'}

**Caratteristiche Distintive**
- ${personality?.neuroticism < 40 ? 'Pazienza e calma anche in situazioni complesse' : 'Empatia e sensibilità verso le esigenze degli studenti'}
- Capacità di rendere anche i concetti più complessi accessibili
- Passione per la materia e per l'insegnamento
- ${prompt.includes('laboratorio') || prompt.includes('pratico') ? 'Competenze pratiche e laboratoriali' : 'Approfondita conoscenza teorica'}

Questa descrizione è stata generata in base al prompt: "${prompt}". Puoi modificarla liberamente per personalizzarla ulteriormente.`

    return NextResponse.json({
      description: mockDescription,
      success: true,
    })
  } catch (error) {
    console.error('Error generating description:', error)
    return NextResponse.json(
      { error: 'Errore nella generazione della descrizione' },
      { status: 500 }
    )
  }
}
