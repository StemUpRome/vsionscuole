/**
 * SymbolicExpressionAdapter
 * Handles mathematical expressions and equations
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

export class SymbolicExpressionAdapter implements DomainAdapter {
  domain = 'math';

  /**
   * Check if observable is a symbolic expression
   */
  canHandle(observable: Observable): boolean {
    return observable.type === 'symbolic_expression';
  }

  /**
   * Analyze symbolic expression and provide guidance
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

    // General analysis based on expression type
    if (this.isEquation(content)) {
      return this.analyzeEquation(observable, state);
    }

    if (this.isExpression(content)) {
      return this.analyzeExpression(observable, state);
    }

    return analysis;
  }

  /**
   * Controlla consistenza matematica per moltiplicazioni
   */
  private checkMultiplicationConsistency(expression: string): { isValid: boolean; error?: string; correctResult?: number } {
    const multMatch = expression.match(/(\d+)\s*[×*]\s*(\d+)\s*=\s*(\d+)/);
    if (!multMatch) return { isValid: true }; // Non è una moltiplicazione completa
    
    const [, a, b, resultStr] = multMatch;
    const numA = parseInt(a);
    const numB = parseInt(b);
    const detectedResult = parseInt(resultStr);
    const correctResult = numA * numB;
    
    if (detectedResult !== correctResult) {
      return {
        isValid: false,
        error: `Il risultato ${detectedResult} non corrisponde a ${numA}×${numB}`,
        correctResult,
      };
    }
    
    return { isValid: true };
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

    // Check multiplication consistency
    const consistency = this.checkMultiplicationConsistency(after.content);
    if (!consistency.isValid) {
      // NON dire il risultato corretto! Solo indica che c'è un problema
      return {
        isValid: false,
        message: 'Il risultato sembra non corrispondere all\'operazione. Controlla passo per passo.',
        suggestedCorrection: 'Verifica il calcolo partendo dai passaggi intermedi',
      };
    }

    // Check if transformation makes mathematical sense
    if (event.transformation === 'replace') {
      return this.validateReplacement(before, after);
    }

    // Check if removing something might break the equation/expression
    if (event.transformation === 'remove') {
      return this.validateRemoval(before);
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

    // Check what's missing or what to focus on
    if (this.isEquation(content)) {
      if (!this.hasLeftSide(content) || !this.hasRightSide(content)) {
        return "Ricorda: un'equazione ha due parti separate dal segno =.\nC'è qualcosa da aggiungere?";
      }

      if (!this.hasVariable(content)) {
        return "Hai scritto un'equazione. Quale incognita stai cercando? (es: x, y)";
      }

      if (!this.isBalanced(content)) {
        return "Controlla: hai fatto lo stesso passaggio su entrambi i lati dell'uguale?";
      }
    }

    if (this.isExpression(content)) {
      if (this.hasMultipleOperations(content)) {
        return "Hai più operazioni in questa espressione.\nRicordi l'ordine delle operazioni? (parentesi, moltiplicazioni/divisioni, addizioni/sottrazioni)";
      }
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
    if (before.content === after.content) return null;

    // Check if it's an addition (content grows)
    if (after.content.length > before.content.length &&
        after.content.includes(before.content)) {
      return 'add';
    }

    // Check if it's a removal (content shrinks)
    if (before.content.length > after.content.length &&
        before.content.includes(after.content)) {
      return 'remove';
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
    return {
      suggestion: "Hai aggiunto qualcosa alla tua espressione.\nControlla: ha senso matematicamente?",
      intervention: 'encouragement',
      nextStep: 'Verifica che tutte le parti siano corrette.',
      suggestedTool: 'number_line',
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
        suggestion: "Hai corretto qualcosa.\nBene! Controlla che il risultato sia corretto.",
        intervention: 'encouragement',
        nextStep: 'Verifica il calcolo passo dopo passo.',
      };
    }

    return {
      suggestion: "Hai modificato l'espressione.\nRicontrolla che tutti i numeri e i segni siano corretti.",
      intervention: 'hint',
      nextStep: 'Controlla ogni passaggio.',
    };
  }

  private analyzeRemove(observable: Observable, state: ObservationState): AdapterAnalysis {
    return {
      suggestion: "Hai rimosso qualcosa.\nAssicurati che l'espressione sia ancora completa.",
      intervention: 'hint',
      nextStep: 'Verifica che non manchi nulla.',
    };
  }

  private analyzeEquation(observable: Observable, state: ObservationState): AdapterAnalysis {
    const content = observable.content.trim();
    
    if (!this.hasLeftSide(content) || !this.hasRightSide(content)) {
      return {
        suggestion: "Un'equazione ha due parti separate dal segno =.\nVerifica di avere sia la parte sinistra che quella destra.",
        intervention: 'hint',
        nextStep: 'Completa l\'equazione con entrambe le parti.',
      };
    }

    if (!this.hasVariable(content)) {
      return {
        suggestion: "In un'equazione c'è sempre almeno un'incognita (come x, y).\nQuale incognita stai cercando?",
        intervention: 'hint',
        nextStep: 'Identifica l\'incognita.',
      };
    }

    return {
      suggestion: "Osserva la tua equazione.\nChe tipo di operazioni vedi? (addizione, sottrazione, moltiplicazione, divisione)",
      intervention: 'none',
      nextStep: 'Identifica le operazioni presenti.',
    };
  }

  private analyzeExpression(observable: Observable, state: ObservationState): AdapterAnalysis {
    const content = observable.content.trim();

    if (this.hasMultipleOperations(content)) {
      return {
        suggestion: "Hai più operazioni in questa espressione.\nRicordi l'ordine delle operazioni? Prima le parentesi, poi moltiplicazioni e divisioni, infine addizioni e sottrazioni.",
        intervention: 'hint',
        suggestedTool: 'number_line',
        nextStep: 'Ordina le operazioni secondo le regole.',
      };
    }

    return {
      suggestion: "Controlla l'espressione.\nSono tutti i numeri e i segni corretti?",
      intervention: 'none',
      nextStep: 'Verifica ogni elemento.',
    };
  }

  private validateReplacement(before: Observable, after: Observable): StepValidation {
    const beforeContent = before.content.trim();
    const afterContent = after.content.trim();

    // Check if it's a valid mathematical transformation
    // Basic check: does it still contain mathematical elements?
    if (!this.hasMathElements(afterContent)) {
      return {
        isValid: false,
        message: "L'espressione non sembra più matematica.\nControlla di aver scritto correttamente.",
        suggestedCorrection: 'Verifica che ci siano numeri, operazioni o incognite.',
      };
    }

    // Check if equation balance is broken
    if (this.isEquation(beforeContent) && this.isEquation(afterContent)) {
      if (this.hasLeftSide(beforeContent) && this.hasRightSide(beforeContent)) {
        // If it was balanced, warn if it might not be anymore
        if (!this.hasLeftSide(afterContent) || !this.hasRightSide(afterContent)) {
          return {
            isValid: false,
            message: "Hai un'equazione. Ricorda di mantenere l'uguale con entrambe le parti.",
            suggestedCorrection: 'Assicurati di avere sia la parte sinistra che quella destra dell\'uguale.',
          };
        }
      }
    }

    return { isValid: true };
  }

  private validateRemoval(observable: Observable): StepValidation {
    const content = observable.content.trim();

    // Check if removal breaks equation structure
    if (this.isEquation(content)) {
      if (!this.hasLeftSide(content) || !this.hasRightSide(content)) {
        return {
          isValid: false,
          message: "Un'equazione deve avere due parti separate dall'uguale.\nSembra che manchi qualcosa.",
          suggestedCorrection: 'Verifica di avere sia la parte sinistra che quella destra dell\'uguale.',
        };
      }
    }

    return { isValid: true };
  }

  // Pattern matching helpers
  private isEquation(content: string): boolean {
    return /=/.test(content);
  }

  private isExpression(content: string): boolean {
    return /[+\-×*÷/]/.test(content) && !this.isEquation(content);
  }

  private hasLeftSide(content: string): boolean {
    const parts = content.split('=');
    return parts.length > 0 && parts[0].trim().length > 0;
  }

  private hasRightSide(content: string): boolean {
    const parts = content.split('=');
    return parts.length > 1 && parts[1].trim().length > 0;
  }

  private hasVariable(content: string): boolean {
    return /[a-z]/.test(content);
  }

  private isBalanced(content: string): boolean {
    // Basic check: has equal sign with content on both sides
    const parts = content.split('=');
    return parts.length === 2 && 
           parts[0].trim().length > 0 && 
           parts[1].trim().length > 0;
  }

  private hasMultipleOperations(content: string): boolean {
    const operationCount = (content.match(/[+\-×*÷/]/g) || []).length;
    return operationCount > 1;
  }

  private hasMathElements(content: string): boolean {
    return /\d/.test(content) || /[+\-×*÷/=]/.test(content) || /[a-z]/.test(content);
  }

  private isLikelyCorrection(before: string, after: string): boolean {
    // Heuristic: if length is similar but content changed, likely a correction
    const lengthDiff = Math.abs(before.length - after.length);
    return lengthDiff < 3 && before !== after;
  }
}

