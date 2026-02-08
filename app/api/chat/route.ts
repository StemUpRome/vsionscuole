import { NextRequest, NextResponse } from 'next/server';

function normalizeImageUrl(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  // OpenAI accetta data URL nel formato data:image/<type>;base64,<data>
  if (s.startsWith('data:image/') && s.includes(';base64,')) return s;
  // Se è solo base64 senza prefisso, aggiungi il prefisso JPEG
  if (s.length > 100 && !s.includes('data:')) return `data:image/jpeg;base64,${s}`;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    let body: {
      message?: string;
      imageBase64?: string;
      history?: unknown[];
      isObserve?: boolean;
      avatarName?: string;
      avatarBackstory?: string;
      responseLanguage?: string;
    };
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error('[Chat API] Invalid JSON or body too large:', parseErr);
      return NextResponse.json(
        { error: 'Richiesta non valida o troppo grande (limite corpo richiesta).', hint: 'Prova senza immagine o riduci la dimensione.' },
        { status: 413 }
      );
    }
    const { message, imageBase64: rawImage, history = [], isObserve = false, avatarName, avatarBackstory, responseLanguage } = body;

    console.log('[Chat API] Request:', { hasImage: !!rawImage, imageLen: typeof rawImage === 'string' ? rawImage.length : 0, msgLen: message?.length, historyCount: Array.isArray(history) ? history.length : 0 });

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[Chat API] OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Normalizza immagine: deve essere data:image/jpeg;base64,... (o data:image/png;base64,...)
    const imageBase64 = normalizeImageUrl(rawImage ?? '');

    if (imageBase64) {
      console.log('[Chat API] Invio messaggio con immagine a GPT-4o Vision (lunghezza URL:', imageBase64.length, ')');
    }

    // Formato richiesto da OpenAI per GPT-4o Vision: content è array con type 'text' e type 'image_url'
    let userContent: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string; detail?: 'low' | 'high' | 'auto' } }>;

    if (imageBase64) {
      userContent = [
        { type: 'text', text: message },
        {
          type: 'image_url',
          image_url: {
            url: imageBase64,
            detail: 'high' // migliore analisi per descrizioni/vision
          }
        }
      ];
    } else {
      userContent = message;
    }

    // Istruzione lingua da codice avatar (en, it, es, fr, de)
    const languageInstructions: Record<string, string> = {
      en: 'Always respond in English.',
      it: 'Rispondi sempre in italiano.',
      es: 'Responde siempre en español.',
      fr: 'Réponds toujours en français.',
      de: 'Antworte immer auf Deutsch.',
    };
    const langInstruction = responseLanguage && languageInstructions[responseLanguage]
      ? ` ${languageInstructions[responseLanguage]}`
      : '';

    // Valori di fallback per demo quando nome o backstory non sono forniti
    const displayName = (avatarName && String(avatarName).trim()) || 'Assistente ZenkAI';
    const displayBackstory = (avatarBackstory && String(avatarBackstory).trim()) || 'Sei un tutor educativo disponibile ad aiutare gli studenti con domande e spiegazioni.';

    // System prompt: inizia SEMPRE con nome e identità (nome + backstory), poi il resto
    const identityBlock = `Il tuo nome è ${displayName}. La tua identità è: ${displayBackstory}`;

    const restOfPrompt = imageBase64 && isObserve
      ? ` L'utente ha premuto OSSERVA e ti sta mostrando un'immagine (sfondo della room o ripresa dalla camera). Analizza gli elementi visibili: cavi, interruttori, circuiti, strumenti, componenti, collegamenti. Fornisci istruzioni passo-passo chiare e sicure. Se vedi testo o numeri scritti a mano, trascrivili prima e poi commentali. Rispondi in modo didattico e preciso.`
      : ` Rispondi in modo chiaro, educativo e incoraggiante. Se l'utente chiede di visualizzare strumenti didattici, suggeriscili con il formato [nome strumento]. Quando ricevi un'immagine: (1) Leggi con attenzione numeri e testo scritti a mano e descrivi esattamente ciò che vedi prima di correggere. (2) Poi fornisci il feedback educativo (correzioni, spiegazioni). Il focus è sul contenuto scritto.${langInstruction}`;

    const systemContent = identityBlock + restOfPrompt;

    const messages = [
      {
        role: 'system',
        content: systemContent
      },
      // Aggiungi la cronologia della conversazione
      ...(Array.isArray(history) ? history : []).map((msg: unknown) => {
        const m = msg as { sender?: string; text?: string };
        return { role: m.sender === 'user' ? 'user' : 'assistant', content: m.text ?? '' };
      }),
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
      const errorMessage = (errorData as { error?: { message?: string; code?: string } })?.error?.message;
      const errorCode = (errorData as { error?: { code?: string } })?.error?.code;
      console.error('[Chat API] OpenAI error:', {
        status: response.status,
        statusText: response.statusText,
        errorCode: errorCode ?? 'none',
        errorMessage: errorMessage ?? 'unknown',
        fullBody: errorData
      });

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
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[Chat API] Exception:', err.message, err);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
