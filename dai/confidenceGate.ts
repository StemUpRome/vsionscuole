/**
 * Confidence Gate
 * 
 * Gestisce il flusso di conferma quando la confidenza è bassa
 * o viene rilevata un'inconsistenza.
 */

export type ConfidenceGateResult = 
  | { 
      needsConfirmation: true; 
      confirmationQuestion: string; 
      rawContent: string;
    }
  | { 
      needsConfirmation: false; 
      proceed: true;
    };

/**
 * Determina se è necessaria una conferma prima di procedere
 */
export function checkConfidenceGate(
  confidence: number,
  content: string,
  detectedIssue?: {
    type: 'inconsistency' | 'error' | 'missing_step';
    description: string;
  }
): ConfidenceGateResult {
  const CONFIDENCE_THRESHOLD = 0.6;
  
  // Se confidenza bassa, chiedi conferma
  if (confidence < CONFIDENCE_THRESHOLD) {
    const preview = content.length > 50 
      ? content.substring(0, 50) + '...' 
      : content;
    
    return {
      needsConfirmation: true,
      confirmationQuestion: `Ho letto: "${preview}". Confermi che è corretto?`,
      rawContent: content,
    };
  }
  
  // Se c'è un problema rilevato, chiedi conferma
  if (detectedIssue && detectedIssue.type === 'inconsistency') {
    return {
      needsConfirmation: true,
      confirmationQuestion: `Noto qualcosa di strano: ${detectedIssue.description}. Vuoi che controlli insieme?`,
      rawContent: content,
    };
  }
  
  // Procedi normalmente
  return {
    needsConfirmation: false,
    proceed: true,
  };
}

/**
 * Stato della conferma utente
 */
export type ConfirmationState = 
  | { status: 'pending'; question: string; rawContent: string }
  | { status: 'confirmed'; proceed: true }
  | { status: 'denied'; message: string };

