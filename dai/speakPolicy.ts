/**
 * DAI Speak Policy
 * 
 * Determina quando il DAI può intervenire per ridurre il chiacchiericcio
 */

export type UserIntent = 
  | 'idle'                    // Inattivo
  | 'writing_in_progress'     // Sta scrivendo
  | 'reading'                 // Sta leggendo
  | 'using_tool'              // Sta usando uno strumento
  | 'thinking';               // Sta pensando

export type ToolState = 
  | { isOpen: false }
  | { isOpen: true; toolId: string };

export interface SpeakPolicyContext {
  intent: UserIntent;
  toolState: ToolState;
  lastInterventionAt: number; // timestamp
  now: number; // timestamp
  newObservation?: boolean;   // C'è una nuova osservazione?
  hasIssue?: boolean;          // C'è un problema rilevato?
}

/**
 * Determina se il DAI può intervenire
 */
export function canIntervene(context: SpeakPolicyContext): boolean {
  const {
    intent,
    toolState,
    lastInterventionAt,
    now,
    newObservation,
    hasIssue,
  } = context;

  // Se sta scrivendo, NON intervenire (solo status silenzioso)
  if (intent === 'writing_in_progress') {
    return false;
  }

  // Se uno strumento è aperto, interventi minimi (solo domande brevi o status)
  if (toolState.isOpen) {
    // Permetti solo se c'è un problema serio E non abbiamo appena parlato
    const timeSinceLastIntervention = now - lastInterventionAt;
    const MIN_INTERVENTION_INTERVAL_TOOL = 5000; // 5 secondi minimi con tool aperto
    
    if (hasIssue && timeSinceLastIntervention > MIN_INTERVENTION_INTERVAL_TOOL) {
      return true;
    }
    
    return false;
  }

  // Intervento normale solo se c'è una nuova osservazione O un problema
  if (!newObservation && !hasIssue) {
    return false;
  }

  // Rate limiting: massimo 1 intervento ogni 3 secondi
  const timeSinceLastIntervention = now - lastInterventionAt;
  const MIN_INTERVENTION_INTERVAL = 3000; // 3 secondi minimi
  
  if (timeSinceLastIntervention < MIN_INTERVENTION_INTERVAL) {
    return false;
  }

  // Se tutto ok, può intervenire
  return true;
}

/**
 * Determina il tipo di intervento permesso
 */
export type InterventionType = 
  | 'full'        // Intervento completo (messaggio + tool)
  | 'minimal'     // Intervento minimo (solo domanda breve o status)
  | 'silent';     // Nessun intervento (solo status UI)

export function getInterventionType(context: SpeakPolicyContext): InterventionType {
  const { intent, toolState } = context;

  if (intent === 'writing_in_progress') {
    return 'silent';
  }

  if (toolState.isOpen) {
    return 'minimal';
  }

  return 'full';
}

/**
 * Rileva l'intento dell'utente basandosi su:
 * - Movimento rilevato nel ROI
 * - Tempo dall'ultimo cambiamento
 * - Stato degli strumenti
 */
export function detectUserIntent(
  motionDetected: boolean,
  timeSinceLastChange: number,
  toolIsOpen: boolean
): UserIntent {
  // Se c'è movimento recente (< 2 secondi), probabilmente sta scrivendo
  if (motionDetected && timeSinceLastChange < 2000) {
    return 'writing_in_progress';
  }

  // Se uno strumento è aperto, sta usando uno strumento
  if (toolIsOpen) {
    return 'using_tool';
  }

  // Se c'è movimento ma non recente, potrebbe essere in lettura
  if (motionDetected) {
    return 'reading';
  }

  // Default: inattivo
  return 'idle';
}

