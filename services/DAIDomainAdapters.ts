/**
 * DAI Domain Adapters
 * Adattatori per domini didattici specifici (Math, Grammar, etc.)
 */

import type { DomainAdapter } from '../dai/adapters';
import type { Observable, ObservationState, Transformation, TransformationEvent } from '../dai/types';
import type { StepValidation } from '../dai/adapters';

// Helper function to detect math content
function isMathContent(content: string): boolean {
  // Pattern per rilevare contenuti matematici
  const mathPatterns = [
    /\d+\s*[+\-×*÷/]\s*\d+/,  // Operazioni base
    /[=<>≤≥≠]/,                // Uguaglianze/diseguaglianze
    /[xyzt]\s*[=+\-]/,         // Variabili
    /√|∫|∑|π|α|β|γ/,          // Simboli matematici
    /\^\d+/,                   // Esponenti
  ];
  return mathPatterns.some(pattern => pattern.test(content));
}

// ==========================================
// MATH DOMAIN ADAPTER
// ==========================================
export const mathDomainAdapter: DomainAdapter = {
  domain: 'math',
  
  canHandle(observable: Observable): boolean {
    return observable.type === 'symbolic_expression' ||
           (observable.type === 'text_block' && isMathContent(observable.content));
  },

  analyze(observable: Observable, state: ObservationState, _recentEvent?: TransformationEvent) {
    const _content = observable.content.trim();
    const lastTransformation = state.transformations[state.transformations.length - 1];

    // Se è un'addizione di nuovo contenuto matematico
    if (lastTransformation?.transformation === 'add' && isMathContent(_content)) {
      return {
        suggestion: "Ottimo! Hai iniziato a lavorare su questa espressione. Ricorda di rispettare l'ordine delle operazioni.",
        intervention: 'encouragement',
        nextStep: 'Verifica i calcoli passo passo.',
      };
    }

    // Se è una sostituzione, potrebbe essere una correzione
    if (lastTransformation?.transformation === 'replace' && isMathContent(_content)) {
      return {
        suggestion: "Hai modificato qualcosa. Verifica che tutti i passaggi siano corretti.",
        intervention: 'hint',
        nextStep: 'Controlla se il risultato finale ha senso.',
      };
    }

    return {
      intervention: 'none',
    };
  },

  detectTransformation(before: Observable, after: Observable): Transformation | null {
    if (before.content === after.content) return null;

    // Se il contenuto è stato completamente sostituito
    if (before.content.length > 0 && after.content.length > 0 && before.content !== after.content) {
      return 'replace';
    }

    // Se il contenuto è stato aggiunto
    if (before.content.length < after.content.length) {
      return 'add';
    }

    // Se il contenuto è stato rimosso
    if (before.content.length > after.content.length) {
      return 'remove';
    }

    return null;
  },

  validateTransition(_previousState: ObservationState, _currentState: ObservationState, _event: TransformationEvent): StepValidation {
    return { isValid: true };
  },

  generateGuidedQuestion(_observable: Observable, _state: ObservationState): string | null {
    return null;
  },
};

// ==========================================
// GRAMMAR DOMAIN ADAPTER
// ==========================================
export const grammarDomainAdapter: DomainAdapter = {
  domain: 'grammar',
  
  canHandle(observable: Observable): boolean {
    return observable.type === 'sentence' ||
           observable.type === 'text_block';
  },

  analyze(observable: Observable, state: ObservationState, _recentEvent?: TransformationEvent) {
    const _content = observable.content.trim();
    const lastTransformation = state.transformations[state.transformations.length - 1];

    // Se è stata aggiunta una nuova frase
    if (lastTransformation?.transformation === 'add' && observable.type === 'sentence') {
      return {
        suggestion: "Bene! Hai scritto una frase. Ricorda di controllare: maiuscola all'inizio, punto alla fine, verbo concordato.",
        intervention: 'hint',
        nextStep: 'Verifica la punteggiatura e la concordanza.',
      };
    }

    // Se è stata modificata una frase esistente
    if (lastTransformation?.transformation === 'replace' && observable.type === 'sentence') {
      return {
        suggestion: "Hai corretto qualcosa. Controlla che la frase sia completa e grammaticalmente corretta.",
        intervention: 'encouragement',
        nextStep: 'Rileggi la frase ad alta voce per verificare che suoni naturale.',
      };
    }

    return {
      intervention: 'none',
    };
  },

  detectTransformation(before: Observable, after: Observable): Transformation | null {
    if (before.content === after.content) return null;

    // Se è stato aggiunto testo
    if (after.content.includes(before.content) && after.content.length > before.content.length) {
      return 'add';
    }

    // Se è stato rimosso testo
    if (before.content.includes(after.content) && before.content.length > after.content.length) {
      return 'remove';
    }

    // Sostituzione
    if (before.content !== after.content) {
      return 'replace';
    }

    return null;
  },

  validateTransition(_previousState: ObservationState, _currentState: ObservationState, _event: TransformationEvent): StepValidation {
    return { isValid: true };
  },

  generateGuidedQuestion(_observable: Observable, _state: ObservationState): string | null {
    return null;
  },
};

// ==========================================
// LIST DOMAIN ADAPTER
// ==========================================
export const listDomainAdapter: DomainAdapter = {
  domain: 'list',
  
  canHandle(observable: Observable): boolean {
    return observable.type === 'list';
  },

  analyze(_observable: Observable, state: ObservationState, _recentEvent?: TransformationEvent) {
    const lastTransformation = state.transformations[state.transformations.length - 1];

    // Se è stato aggiunto un elemento alla lista
    if (lastTransformation?.transformation === 'add') {
      return {
        suggestion: "Hai aggiunto un elemento alla lista. Assicurati che sia coerente con gli altri punti.",
        intervention: 'encouragement',
        nextStep: 'Verifica che tutti gli elementi seguano lo stesso formato.',
      };
    }

    // Se è stato riordinato
    if (lastTransformation?.transformation === 'reorder') {
      return {
        suggestion: "Hai riordinato la lista. Controlla che l'ordine sia logico.",
        intervention: 'hint',
        nextStep: 'Verifica che la sequenza abbia senso.',
      };
    }

    return {
      intervention: 'none',
    };
  },

  detectTransformation(before: Observable, after: Observable): Transformation | null {
    if (before.content === after.content) return null;

    // Estrai elementi della lista (semplificato: righe separate)
    const beforeItems = before.content.split('\n').filter(line => line.trim());
    const afterItems = after.content.split('\n').filter(line => line.trim());

    // Se il numero di elementi è cambiato
    if (afterItems.length > beforeItems.length) {
      return 'add';
    }
    if (afterItems.length < beforeItems.length) {
      return 'remove';
    }

    // Se gli elementi sono gli stessi ma in ordine diverso
    const beforeSet = new Set(beforeItems);
    const afterSet = new Set(afterItems);
    if (beforeSet.size === afterSet.size && 
        Array.from(beforeSet).every(item => afterSet.has(item))) {
      return 'reorder';
    }

    // Altrimenti è una sostituzione
    return 'replace';
  },

  validateTransition(_previousState: ObservationState, _currentState: ObservationState, _event: TransformationEvent): StepValidation {
    return { isValid: true };
  },

  generateGuidedQuestion(_observable: Observable, _state: ObservationState): string | null {
    return null;
  },
};

// ==========================================
// DIAGRAM DOMAIN ADAPTER
// ==========================================
export const diagramDomainAdapter: DomainAdapter = {
  domain: 'diagram',
  
  canHandle(observable: Observable): boolean {
    return observable.type === 'diagram';
  },

  analyze(_observable: Observable, state: ObservationState, _recentEvent?: TransformationEvent) {
    const lastTransformation = state.transformations[state.transformations.length - 1];

    // Se è stato aggiunto un diagramma
    if (lastTransformation?.transformation === 'add') {
      return {
        suggestion: "Hai creato un diagramma. Assicurati che sia chiaro e completo.",
        intervention: 'encouragement',
        nextStep: 'Verifica che tutte le parti siano etichettate correttamente.',
      };
    }

    // Se è stata aggiunta un'annotazione
    if (lastTransformation?.transformation === 'annotate') {
      return {
        suggestion: "Hai aggiunto un'annotazione. Questo aiuta a chiarire il diagramma.",
        intervention: 'encouragement',
        nextStep: 'Controlla che l\'annotazione sia leggibile e pertinente.',
      };
    }

    return {
      intervention: 'none',
    };
  },

  detectTransformation(before: Observable, after: Observable): Transformation | null {
    // Per i diagrammi, la rilevazione è più complessa e potrebbe richiedere vision analysis
    // Per ora restituiamo null o una trasformazione generica
    if (before.content !== after.content) {
      // Se il contenuto testuale è cambiato, potrebbe essere un'annotazione
      if (before.content.length < after.content.length) {
        return 'annotate';
      }
      return 'replace';
    }
    return null;
  },

  validateTransition(_previousState: ObservationState, _currentState: ObservationState, _event: TransformationEvent): StepValidation {
    return { isValid: true };
  },

  generateGuidedQuestion(_observable: Observable, _state: ObservationState): string | null {
    return null;
  },
};

// Export tutti gli adapter
export const domainAdapters: DomainAdapter[] = [
  mathDomainAdapter,
  grammarDomainAdapter,
  listDomainAdapter,
  diagramDomainAdapter,
];

