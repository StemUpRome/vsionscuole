import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, imageBase64, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Prepara il contenuto del messaggio utente (testo + immagine se disponibile)
    let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    
    if (imageBase64 && typeof imageBase64 === 'string') {
      // Se c'è un'immagine, usa il formato multi-modal
      userContent = [
        {
          type: 'text',
          text: message
        },
        {
          type: 'image_url',
          image_url: {
            url: imageBase64 // OpenAI accetta il formato completo data:image/jpeg;base64,...
          }
        }
      ];
    } else {
      // Solo testo
      userContent = message;
    }

    // Prepara i messaggi per OpenAI (formato conversazione)
    const messages = [
      {
        role: 'system',
        content: 'Sei un assistente educativo AI per ZenkAI. Aiuti gli studenti con esercizi di matematica, italiano, scienze e altre materie. Rispondi in modo chiaro, educativo e incoraggiante. Se l\'utente chiede di visualizzare strumenti didattici, suggeriscili usando il formato [nome strumento]. Quando ricevi un\'immagine, analizzala attentamente e fornisci feedback educativo basato su ciò che vedi.'
      },
      // Aggiungi la cronologia della conversazione
      ...history.map((msg: { sender: string; text: string }) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      // Aggiungi il nuovo messaggio (con o senza immagine)
      {
        role: 'user',
        content: userContent
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: imageBase64 ? 'gpt-4o-mini' : 'gpt-4o-mini', // gpt-4o-mini supporta vision, altrimenti usa gpt-4o o gpt-4-turbo
        messages: messages,
        temperature: 0.7,
        max_tokens: imageBase64 ? 1000 : 500 // Più token se c'è un'immagine da analizzare
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      
      // Se gpt-4o-mini non è disponibile, prova con modelli alternativi
      if (response.status === 404 || (errorData.error?.code === 'model_not_found')) {
        // Se c'è un'immagine, prova con gpt-4o o gpt-4-turbo (supportano vision)
        // Altrimenti usa gpt-3.5-turbo
        const fallbackModel = imageBase64 ? 'gpt-4o' : 'gpt-3.5-turbo';
        
        const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: fallbackModel,
            messages: messages,
            temperature: 0.7,
            max_tokens: imageBase64 ? 1000 : 500
          })
        });

        if (!fallbackResponse.ok) {
          const fallbackError = await fallbackResponse.json().catch(() => ({}));
          return NextResponse.json(
            { error: 'Failed to get response from OpenAI', details: fallbackError },
            { status: fallbackResponse.status }
          );
        }

        const fallbackData = await fallbackResponse.json();
        return NextResponse.json({
          message: fallbackData.choices[0]?.message?.content || 'Nessuna risposta disponibile'
        });
      }

      return NextResponse.json(
        { error: 'Failed to get response from OpenAI', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || 'Nessuna risposta disponibile';

    return NextResponse.json({
      message: aiMessage
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
