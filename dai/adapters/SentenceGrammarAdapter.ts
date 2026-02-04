/**
 * SentenceGrammarAdapter
 * Handles sentences and grammatical structures
 * 
 * Rules:
 * - Guide, never solve
 * - Validate step-to-step transitions
 * - BES-friendly language
 */

import type {
  DomainAdapter,
  AdapterAnalysis,
  StepValidation,
} from './types';
import type { Observable, ObservationState, TransformationEvent, Transformation } from '../types';

export class SentenceGrammarAdapter implements DomainAdapter {
  domain = 'grammar';

  /**
   * Check if observable is a sentence
   */
  canHandle(observable: Observable): boolean {
    return observable.type === 'sentence' || observable.type === 'text_block';
  }

  /**
   * Analyze sentence and provide guidance
   */
  analyze(
    observable: Observable,
    state: ObservationState,
    recentEvent?: TransformationEvent
  ): AdapterAnalysis {
    const content = observable.content.trim();
    const analysis: AdapterAnalysis = {
      intervention: 'none',
    };

    // Analyze based on recent transformation
    if (recentEvent) {
      switch (recentEvent.transformation) {
        case 'add':
          return this.analyzeAdd(observable, state);
        case 'replace':
          return this.analyzeReplace(observable, state, recentEvent);
        case 'remove':
          return this.analyzeRemove(observable, state);
        default:
          break;
      }
    }

    // General analysis based on sentence structure
    return this.analyzeSentenceStructure(observable, state);
  }

  /**
   * Validate step-to-step transition
   */
  validateTransition(
    previousState: ObservationState,
    currentState: ObservationState,
    event: TransformationEvent
  ): StepValidation {
    const before = previousState.observables.get(event.observableId);
    const after = currentState.observables.get(event.observableId);

    if (!before || !after) {
      return { isValid: true }; // New or removed observable is valid
    }

    // Check if transformation makes grammatical sense
    if (event.transformation === 'replace') {
      return this.validateReplacement(before, after);
    }

    // Check if removing something breaks sentence structure
    if (event.transformation === 'remove') {
      return this.validateRemoval(before, after);
    }

    return { isValid: true };
  }

  /**
   * Generate guided question
   */
  generateGuidedQuestion(
    observable: Observable,
    state: ObservationState
  ): string | null {
    const content = observable.content.trim();

    // Check sentence completeness
    if (!this.hasCapitalLetter(content)) {
      return "Una frase inizia sempre con la maiuscola.\nHai messo la maiuscola all'inizio?";
    }

    if (!this.hasEndPunctuation(content)) {
      return "Una frase finisce sempre con un punto, un punto esclamativo o un punto interrogativo.\nHai messo il punto alla fine?";
    }

    if (!this.hasVerb(content)) {
      return "Una frase completa contiene sempre un verbo.\nC'è un verbo nella tua frase?";
    }

    // Check for common errors
    if (this.hasDoubleSpaces(content)) {
      return "Controlla gli spazi nella frase.\nCi sono spazi doppi o in più?";
    }

    if (!this.hasProperSpacing(content)) {
      return "Ricorda di lasciare uno spazio dopo i segni di punteggiatura.\nHai lasciato gli spazi corretti?";
    }

    return null;
  }

  /**
   * Detect transformation type
   */
  detectTransformation(
    before: Observable,
    after: Observable
  ): Transformation | null {
    if (before.content === before.content) return null;

    // Check if it's an addition (content grows, likely contains previous content)
    if (after.content.length > before.content.length) {
      // Check if it's a replacement that added content
      if (after.content.includes(before.content)) {
        return 'add';
      }
    }

    // Check if it's a removal (content shrinks)
    if (before.content.length > after.content.length) {
      if (before.content.includes(after.content)) {
        return 'remove';
      }
    }

    // Check if it's reordering (similar length, similar words but different order)
    if (this.isReordering(before.content, after.content)) {
      return 'reorder';
    }

    // Otherwise it's a replacement
    if (before.content !== after.content) {
      return 'replace';
    }

    return null;
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private analyzeAdd(observable: Observable, state: ObservationState): AdapterAnalysis {
    const content = observable.content.trim();

    // Check if sentence is now complete
    if (this.isCompleteSentence(content)) {
      return {
        suggestion: "Ottimo! Hai completato la frase.\nControlla: ha senso? È scritta correttamente?",
        intervention: 'encouragement',
        nextStep: 'Rileggi la frase ad alta voce per verificare che suoni naturale.',
        suggestedTool: 'grammar_analyzer',
      };
    }

    return {
      suggestion: "Hai aggiunto qualcosa alla frase.\nControlla: la frase è completa? Ha un verbo e finisce con un punto?",
      intervention: 'hint',
      nextStep: 'Verifica che la frase sia completa.',
    };
  }

  private analyzeReplace(
    observable: Observable,
    state: ObservationState,
    event: TransformationEvent
  ): AdapterAnalysis {
    const before = event.before || '';
    const after = event.after || '';

    // Check if it looks like a correction
    if (this.isLikelyCorrection(before, after)) {
      return {
        suggestion: "Hai corretto qualcosa nella frase.\nBene! Controlla che tutto sia scritto correttamente.",
        intervention: 'encouragement',
        nextStep: 'Rileggi la frase per verificare.',
        suggestedTool: 'grammar_analyzer',
      };
    }

    return {
      suggestion: "Hai modificato la frase.\nRileggila per verificare che abbia senso e sia corretta.",
      intervention: 'hint',
      nextStep: 'Controlla ortografia, punteggiatura e grammatica.',
    };
  }

  private analyzeRemove(observable: Observable, state: ObservationState): AdapterAnalysis {
    const content = observable.content.trim();

    // Check if sentence is still complete
    if (!this.isCompleteSentence(content)) {
      return {
        suggestion: "Hai rimosso qualcosa dalla frase.\nControlla: la frase è ancora completa? Ha un verbo e finisce con un punto?",
        intervention: 'hint',
        nextStep: 'Verifica che la frase sia completa.',
      };
    }

    return {
      suggestion: "Hai rimosso qualcosa.\nLa frase ha ancora senso? È completa?",
      intervention: 'hint',
      nextStep: 'Rileggi la frase per verificare.',
    };
  }

  private analyzeSentenceStructure(
    observable: Observable,
    state: ObservationState
  ): AdapterAnalysis {
    const content = observable.content.trim();

    if (!this.hasCapitalLetter(content)) {
      return {
        suggestion: "Una frase inizia sempre con la maiuscola.\nControlla di aver messo la maiuscola all'inizio.",
        intervention: 'hint',
        nextStep: 'Aggiungi la maiuscola all\'inizio della frase.',
      };
    }

    if (!this.hasEndPunctuation(content)) {
      return {
        suggestion: "Una frase finisce sempre con un punto, un punto esclamativo (!) o un punto interrogativo (?).\nHai messo il punto alla fine?",
        intervention: 'hint',
        nextStep: 'Aggiungi il punto alla fine della frase.',
      };
    }

    if (!this.hasVerb(content)) {
      return {
        suggestion: "Una frase completa contiene sempre un verbo.\nC'è un verbo nella tua frase?",
        intervention: 'hint',
        nextStep: 'Aggiungi un verbo alla frase.',
        suggestedTool: 'grammar_analyzer',
      };
    }

    return {
      suggestion: "Controlla la tua frase.\nHa senso? È scritta correttamente?",
      intervention: 'none',
      nextStep: 'Rileggi la frase per verificare.',
    };
  }

  private validateReplacement(before: Observable, after: Observable): StepValidation {
    const beforeContent = before.content.trim();
    const afterContent = after.content.trim();

    // Check if sentence still has basic structure
    if (!this.hasCapitalLetter(afterContent)) {
      return {
        isValid: false,
        message: "Una frase deve iniziare con la maiuscola.\nControlla di averla messa all'inizio.",
        suggestedCorrection: 'Aggiungi la maiuscola all\'inizio della frase.',
      };
    }

    // Check if removing end punctuation
    if (this.hasEndPunctuation(beforeContent) && !this.hasEndPunctuation(afterContent)) {
      return {
        isValid: false,
        message: "Una frase deve finire con un punto, un punto esclamativo o un punto interrogativo.",
        suggestedCorrection: 'Aggiungi il punto alla fine della frase.',
      };
    }

    // Check if sentence became incomplete
    if (this.isCompleteSentence(beforeContent) && !this.isCompleteSentence(afterContent)) {
      return {
        isValid: false,
        message: "La frase sembra incompleta.\nControlla che ci sia un verbo e che finisca con un punto.",
        suggestedCorrection: 'Completa la frase con tutte le parti necessarie.',
      };
    }

    return { isValid: true };
  }

  private validateRemoval(before: Observable, after: Observable): StepValidation {
    const beforeContent = before.content.trim();
    const afterContent = after.content.trim();

    // Check if removing essential punctuation
    if (this.hasEndPunctuation(beforeContent) && !this.hasEndPunctuation(afterContent)) {
      return {
        isValid: false,
        message: "Ricorda: una frase deve finire con un punto, un punto esclamativo o un punto interrogativo.",
        suggestedCorrection: 'Aggiungi il punto alla fine.',
      };
    }

    // Check if sentence became too short to be complete
    if (beforeContent.length > 10 && afterContent.length < 5) {
      return {
        isValid: false,
        message: "La frase è diventata troppo corta.\nSembra incompleta. Vuoi continuare a scrivere?",
        suggestedCorrection: 'Completa la frase.',
      };
    }

    return { isValid: true };
  }

  // Pattern matching helpers
  private hasCapitalLetter(content: string): boolean {
    return /^[A-ZÀÁÈÉÌÍÒÓÙÚ]/.test(content);
  }

  private hasEndPunctuation(content: string): boolean {
    return /[.!?]$/.test(content.trim());
  }

  private hasVerb(content: string): boolean {
    // Basic check: look for common Italian verb endings
    const verbPatterns = [
      /\b(è|sono|ha|hanno|fa|fanno|va|vanno|sta|stanno|va|viene|vengono)\b/i,
      /\b\w+(a|e|i|o|no|va|vi|vo|vano|rà|ranno|to|ti|ta|te|ti)\b/i,
    ];
    return verbPatterns.some(pattern => pattern.test(content));
  }

  private isCompleteSentence(content: string): boolean {
    return (
      this.hasCapitalLetter(content) &&
      this.hasEndPunctuation(content) &&
      this.hasVerb(content) &&
      content.trim().length > 10
    );
  }

  private hasDoubleSpaces(content: string): boolean {
    return /\s{2,}/.test(content);
  }

  private hasProperSpacing(content: string): boolean {
    // Check for space after punctuation (except at end)
    return !/[.,;:!?](?![.!?]\s*$)\S/.test(content);
  }

  private hasMathElements(content: string): boolean {
    return /\d/.test(content) || /[+\-×*÷/=]/.test(content) || /[a-z]/.test(content);
  }

  private isLikelyCorrection(before: string, after: string): boolean {
    // Heuristic: if length is similar but content changed, likely a correction
    const lengthDiff = Math.abs(before.length - after.length);
    return lengthDiff < 5 && before !== after;
  }

  private isReordering(before: string, after: string): boolean {
    // Check if words are similar but in different order
    const beforeWords = before.toLowerCase().split(/\s+/).sort().join(' ');
    const afterWords = after.toLowerCase().split(/\s+/).sort().join(' ');
    
    // If sorted words are similar and length is similar, might be reordering
    const similarity = this.calculateSimilarity(beforeWords, afterWords);
    return similarity > 0.7 && Math.abs(before.length - after.length) < 10;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity: common characters / total characters
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const matches = longer.split('').filter((char, index) => 
      shorter[index] === char
    ).length;
    
    return matches / longer.length;
  }
}

