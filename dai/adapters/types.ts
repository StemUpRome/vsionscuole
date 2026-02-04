/**
 * DAI Domain Adapter Types
 * Interfaces for domain-specific adapters
 */

import type { Observable, ObservationState, TransformationEvent } from '../types';

/**
 * Result of adapter analysis
 */
export interface AdapterAnalysis {
  suggestion?: string;              // Guided question or hint (BES-friendly)
  intervention?: 'hint' | 'correction' | 'encouragement' | 'none';
  nextStep?: string;                // Suggested next step in the process
  suggestedTool?: string;           // Tool ID to suggest (e.g., 'number_line', 'grammar_analyzer')
  isValidTransition?: boolean;      // Whether the transition to this state is valid
  validationMessage?: string;       // Message explaining why transition is invalid (if applicable)
}

/**
 * Step validation result
 */
export interface StepValidation {
  isValid: boolean;
  message?: string;                 // BES-friendly explanation
  suggestedCorrection?: string;     // What to check or revise
}

/**
 * Domain Adapter Interface
 */
export interface DomainAdapter {
  /**
   * Domain identifier (e.g., 'math', 'grammar')
   */
  domain: string;

  /**
   * Check if this adapter can handle the given observable
   */
  canHandle(observable: Observable): boolean;

  /**
   * Analyze the observable and current state to provide guidance
   */
  analyze(
    observable: Observable,
    state: ObservationState,
    recentEvent?: TransformationEvent
  ): AdapterAnalysis;

  /**
   * Validate step-to-step transition
   */
  validateTransition(
    previousState: ObservationState,
    currentState: ObservationState,
    event: TransformationEvent
  ): StepValidation;

  /**
   * Generate a guided question based on current state and observable
   */
  generateGuidedQuestion(
    observable: Observable,
    state: ObservationState
  ): string | null;

  /**
   * Detect transformation type between two observables
   */
  detectTransformation(
    before: Observable,
    after: Observable
  ): TransformationEvent['transformation'] | null;
}

