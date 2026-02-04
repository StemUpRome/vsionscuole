/**
 * DAI Response Template
 * 
 * Formatta i messaggi del DAI in modo "verify-first" e teacher-like,
 * seguendo il principio: guida, non risolve.
 */

export type DAIMessage = {
  see: string;        // Cosa vedo (fattuale, nessuna assunzione)
  check?: string;     // Cosa sembra inconsistente / da verificare (opzionale)
  question: string;   // Domanda guidata (1 domanda, non spiegazione)
  tool?: {            // Strumento suggerito (opzionale, 1 strumento)
    id: string;
    label: string;
  };
};

/**
 * Formatta una risposta DAI in modo teacher-like
 */
export function formatDAIMessage(
  observable: {
    type: string;
    content: string;
    confidence: number;
  },
  detectedIssue?: {
    type: 'inconsistency' | 'error' | 'missing_step';
    description: string;
    context?: string;
  },
  suggestedTool?: string
): DAIMessage {
  const { type, content } = observable;

  // 1. WHAT I SEE (fattuale, nessuna assunzione)
  let see = '';
  
  if (type === 'symbolic_expression') {
    // Per espressioni matematiche, descrivi solo ciò che vedi
    const cleanContent = content.trim();
    if (cleanContent.includes('×') || cleanContent.includes('*')) {
      see = `Vedo un'operazione di moltiplicazione: ${cleanContent}`;
    } else if (cleanContent.includes('+')) {
      see = `Vedo un'operazione di addizione: ${cleanContent}`;
    } else if (cleanContent.includes('-')) {
      see = `Vedo un'operazione di sottrazione: ${cleanContent}`;
    } else if (cleanContent.includes('÷') || cleanContent.includes('/')) {
      see = `Vedo un'operazione di divisione: ${cleanContent}`;
    } else {
      see = `Vedo un'espressione matematica: ${cleanContent}`;
    }
  } else if (type === 'sentence') {
    see = `Vedo una frase: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`;
  } else if (type === 'text_block') {
    see = `Vedo un blocco di testo con ${content.split(/\s+/).length} parole`;
  } else {
    see = `Vedo: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`;
  }

  // 2. WHAT SEEMS INCONSISTENT (se c'è un problema rilevato)
  let check: string | undefined;
  
  if (detectedIssue) {
    if (detectedIssue.type === 'inconsistency') {
      check = `Noto qualcosa che potrebbe non essere corretto: ${detectedIssue.description}`;
    } else if (detectedIssue.type === 'error') {
      check = `C'è qualcosa da verificare: ${detectedIssue.description}`;
    } else if (detectedIssue.type === 'missing_step') {
      check = `Manca un passaggio: ${detectedIssue.description}`;
    }
  }

  // 3. GUIDED QUESTION (1 domanda guidata, NON spiegazione)
  let question = '';
  
  if (detectedIssue) {
    if (type === 'symbolic_expression' && detectedIssue.type === 'error') {
      // Per moltiplicazioni, chiedi di verificare step-by-step
      const match = content.match(/(\d+)\s*[×*]\s*(\d+)/);
      if (match) {
        const [, a, b] = match;
        question = `Per ${a}×${b}, puoi pensare ${a}×10 e poi aggiungere ${a}. Quanto fa ${a}×10?`;
      } else {
        question = 'Puoi verificare il calcolo passo per passo?';
      }
    } else if (detectedIssue.type === 'missing_step') {
      question = detectedIssue.context || 'Quale passaggio manca?';
    } else {
      question = 'Puoi controllare questo punto?';
    }
  } else {
    // Domanda generica se non c'è problema
    if (type === 'symbolic_expression') {
      question = 'Che tipo di operazione vedi? (addizione, sottrazione, moltiplicazione, divisione)';
    } else if (type === 'sentence') {
      question = 'Cosa stai analizzando in questa frase?';
    } else {
      question = 'Cosa vuoi fare con questo?';
    }
  }

  // 4. SUGGESTED TOOL (opzionale, 1 strumento)
  let tool: { id: string; label: string } | undefined;
  
  if (suggestedTool) {
    const toolLabels: Record<string, string> = {
      'number_line': 'Linea dei Numeri',
      'fraction_visual': 'Visualizzatore Frazioni',
      'grammar_analyzer': 'Analisi Grammaticale',
      'flashcard_viewer': 'Flashcard',
      'concept_map': 'Mappa Concettuale',
    };
    
    tool = {
      id: suggestedTool,
      label: toolLabels[suggestedTool] || suggestedTool,
    };
  } else if (detectedIssue && type === 'symbolic_expression') {
    // Suggerisci strumento basato sul contesto
    if (content.includes('×') || content.includes('*')) {
      tool = { id: 'number_line', label: 'Linea dei Numeri' };
    }
  }

  return {
    see,
    check,
    question,
    tool,
  };
}

/**
 * Converte DAIMessage in testo formattato per UI
 */
export function formatMessageForUI(message: DAIMessage): string {
  let output = `👁️ **Cosa vedo:**\n${message.see}\n\n`;
  
  if (message.check) {
    output += `⚠️ **Da verificare:**\n${message.check}\n\n`;
  }
  
  output += `❓ **Domanda:**\n${message.question}`;
  
  if (message.tool) {
    output += `\n\n🛠️ **Strumento suggerito:** ${message.tool.label}`;
  }
  
  return output;
}

