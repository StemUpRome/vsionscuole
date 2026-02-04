/**
 * ObservationOrchestrator
 * Orchestrates the complete DAI observation workflow:
 * - Timeline management
 * - Observable classification
 * - Transformation detection
 * - Domain adapter routing
 * - Validation and feedback
 */

import type {
  Observable,
  ObservationState,
  TransformationEvent,
} from '../types';
import { classifyObservable, detectTransformations, createObservable } from '../core';
import { getAdapterForObservable, type StepValidation } from '../adapters';
import { formatDAIMessage, formatMessageForUI, type DAIMessage } from '../responseTemplate';
import { checkConfidenceGate } from '../confidenceGate';
import { filterMeaningfulEvents, type MeaningfulEvent } from '../meaningfulEvents';
import type { ContextualFlashcard } from '../flashcards/generateFlashcards';
import { canIntervene, getInterventionType, detectUserIntent, type UserIntent, type ToolState, type InterventionType } from '../speakPolicy';

export interface ObservationFeedback {
  message?: string;
  intervention?: 'hint' | 'correction' | 'encouragement' | 'none';
  suggestedTool?: string;
  suggestedCorrection?: string;
  validationResult?: StepValidation;
  isValidTransition?: boolean;
  daiMessage?: DAIMessage; // Nuovo formato strutturato
  needsConfirmation?: boolean; // Se richiede conferma
  confirmationQuestion?: string; // Domanda di conferma
  flashcards?: ContextualFlashcard[]; // Flashcard contestuali
  bbox?: { x: number; y: number; width: number; height: number }; // Bbox per auto-tight ROI
  meaningfulEvents?: MeaningfulEvent[]; // Eventi significativi
}

export interface ObservationOrchestratorCallbacks {
  onFeedback?: (feedback: ObservationFeedback) => void;
  onObservableDetected?: (observable: Observable) => void;
  onTransformationDetected?: (event: TransformationEvent) => void;
}

export class ObservationOrchestrator {
  private state: ObservationState | null = null;
  private callbacks: ObservationOrchestratorCallbacks;
  private lastSnapshotObservables: Map<string, Observable> = new Map();

  constructor(callbacks: ObservationOrchestratorCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Initialize observation session
   */
  initialize(
    sessionId: string,
    roiBounds: { x: number; y: number; width: number; height: number }
  ): void {
    this.state = {
      sessionId,
      startTime: Date.now(),
      observables: new Map(),
      transformations: [],
      currentStep: 1,
      isActive: true,
      roiBounds,
      lastSnapshotTime: Date.now(),
      motionDetected: false,
    };
    this.lastSnapshotObservables = new Map();
  }

  /**
   * Process new content snapshot from ROI
   * This is the main entry point for processing new observations
   */
  processSnapshot(
    content: string,
    bounds: { x: number; y: number; width: number; height: number },
    confidence: number = 0.8
  ): void {
    if (!this.state || !this.state.isActive) {
      console.warn('[Orchestrator] Observation not active');
      return;
    }

    // Skip empty content
    if (!content || content.trim().length === 0) {
      return;
    }

    // Classify the observable
    const observableType = classifyObservable(content);

    // Create observable from content
    const observable = createObservable(content, bounds, confidence, {
      classifiedAt: Date.now(),
    });

    // Update observable type with classified type
    observable.type = observableType;

    // Process observable through timeline
    this.processObservable(observable);
  }

  /**
   * Process a single observable through the system
   */
  private processObservable(observable: Observable): void {
    if (!this.state) return;

    // Check if this observable already exists
    const existingObservable = this.findSimilarObservable(observable);

    if (existingObservable) {
      // Observable exists - check for transformations
      if (existingObservable.content !== observable.content) {
        // Content changed - detect transformation
        this.processTransformation(existingObservable, observable);
      }
      // Update existing observable
      this.state.observables.set(existingObservable.id, observable);
    } else {
      // New observable - add to timeline
      this.state.observables.set(observable.id, observable);
      this.lastSnapshotObservables.set(observable.id, observable);

      // Notify new observable detected
      this.callbacks.onObservableDetected?.(observable);

      // Analyze new observable with domain adapter
      this.analyzeObservable(observable, null);
    }
  }

  /**
   * Process transformation between two observables
   */
  private processTransformation(
    before: Observable,
    after: Observable
  ): void {
    if (!this.state) return;

    // Detect transformation type using domain adapter
    const adapter = getAdapterForObservable(before);
    let transformationType: TransformationEvent['transformation'] | null = null;

    if (adapter) {
      transformationType = adapter.detectTransformation(before, after);
    }

    // Fallback to core detection if adapter doesn't detect
    if (!transformationType) {
      const transformations = detectTransformations(
        new Map([[before.id, before]]),
        new Map([[after.id, after]])
      );
      if (transformations.length > 0) {
        transformationType = transformations[0].transformation;
      }
    }

    if (!transformationType) return;

    // Create transformation event
    const event: TransformationEvent = {
      id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transformation: transformationType,
      observableId: after.id,
      observableType: after.type,
      timestamp: Date.now(),
      before: before.content,
      after: after.content,
      position: {
        x: after.bounds.x,
        y: after.bounds.y,
      },
      metadata: {
        beforeBounds: before.bounds,
        afterBounds: after.bounds,
      },
    };

    // Append to timeline
    this.state.transformations.push(event);
    this.lastSnapshotObservables.set(after.id, after);

    // Notify transformation detected
    this.callbacks.onTransformationDetected?.(event);

    // Validate transition and analyze
    this.validateAndAnalyze(event, before, after);
  }

  /**
   * Validate transition and analyze with domain adapter
   */
  private validateAndAnalyze(
    event: TransformationEvent,
    before: Observable,
    after: Observable
  ): void {
    if (!this.state) return;

    const adapter = getAdapterForObservable(after);
    if (!adapter) {
      // No adapter - just analyze the observable
      this.analyzeObservable(after, event);
      return;
    }

    // Validate transition
    const previousState = {
      ...this.state,
      observables: new Map([[before.id, before]]),
    };
    const currentState = {
      ...this.state,
      observables: new Map([[after.id, after]]),
    };

    const validation = adapter.validateTransition(
      previousState,
      currentState,
      event
    );

    // Analyze with adapter
    const analysis = adapter.analyze(after, this.state, event);

    // Generate guided question if available
    const guidedQuestion = adapter.generateGuidedQuestion(after, this.state);

    // Dispatch feedback
    this.dispatchFeedback({
      message: analysis.suggestion || guidedQuestion || undefined,
      intervention: analysis.intervention || 'none',
      suggestedTool: analysis.suggestedTool,
      validationResult: validation,
      isValidTransition: validation.isValid,
    });

    // If validation failed, provide correction guidance
    if (!validation.isValid && validation.message) {
      this.dispatchFeedback({
        message: validation.message,
        intervention: 'correction',
        suggestedCorrection: validation.suggestedCorrection,
        isValidTransition: false,
      });
    }
  }

  /**
   * Analyze observable with domain adapter
   */
  private analyzeObservable(
    observable: Observable,
    recentEvent: TransformationEvent | null
  ): void {
    if (!this.state) return;

    const adapter = getAdapterForObservable(observable);
    if (!adapter) {
      // No adapter for this observable type
      // Still generate basic DAI message
      const daiMessage = formatDAIMessage(
        {
          type: observable.type,
          content: observable.content,
          confidence: observable.confidence,
        },
        undefined,
        undefined
      );

      this.dispatchFeedback({
        message: formatMessageForUI(daiMessage),
        daiMessage,
        intervention: 'none',
        isValidTransition: true,
      });
      return;
    }

    // Analyze with adapter
    const analysis = adapter.analyze(observable, this.state, recentEvent || undefined);

    // Check confidence gate
    const confidenceResult = checkConfidenceGate(
      observable.confidence,
      observable.content
    );

    // Generate DAI message using template
    const daiMessage = formatDAIMessage(
      {
        type: observable.type,
        content: observable.content,
        confidence: observable.confidence,
      },
      undefined,
      analysis.suggestedTool
    );

    // Filter meaningful events
    const meaningfulEvents = filterMeaningfulEvents(
      this.state.transformations.slice(-10),
      this.state.observables
    );

    // Dispatch feedback with new structure
    this.dispatchFeedback({
      message: formatMessageForUI(daiMessage),
      daiMessage,
      intervention: analysis.intervention || 'none',
      suggestedTool: daiMessage.tool?.id || analysis.suggestedTool,
      isValidTransition: true,
      needsConfirmation: confidenceResult.needsConfirmation,
      confirmationQuestion: confidenceResult.needsConfirmation ? confidenceResult.confirmationQuestion : undefined,
      meaningfulEvents,
    });
  }

  /**
   * Find similar observable in current state
   * Uses simple heuristics: same position, similar content
   */
  private findSimilarObservable(
    observable: Observable
  ): Observable | null {
    if (!this.state) return null;

    // Find observables in similar position (within 10% of bounds)
    const positionThreshold = 0.1;
    for (const [, existing] of this.state.observables.entries()) {
      const dx = Math.abs(existing.bounds.x - observable.bounds.x);
      const dy = Math.abs(existing.bounds.y - observable.bounds.y);
      const dw = Math.abs(existing.bounds.width - observable.bounds.width);
      const dh = Math.abs(existing.bounds.height - observable.bounds.height);

      if (
        dx < positionThreshold &&
        dy < positionThreshold &&
        dw < positionThreshold &&
        dh < positionThreshold
      ) {
        return existing;
      }
    }

    return null;
  }

  /**
   * Dispatch feedback to callbacks
   * Respects BES rules: one intervention per step, guide never solve
   */
  private dispatchFeedback(feedback: ObservationFeedback): void {
    // BES Rule: One intervention per step
    // Only dispatch if we have a meaningful message
    if (!feedback.message && !feedback.validationResult) {
      return;
    }

    // BES Rule: Guide, never solve
    // Ensure messages are guiding, not solving
    if (feedback.message) {
      // Basic check: don't provide direct answers
      const solvingKeywords = ['risultato è', 'la risposta è', 'devi scrivere', 'devi mettere'];
      const isSolving = solvingKeywords.some(keyword => 
        feedback.message!.toLowerCase().includes(keyword)
      );

      if (isSolving) {
        // Convert to guiding question
        feedback.message = "Pensa a cosa potresti controllare in questa parte.";
        feedback.intervention = 'hint';
      }
    }

    this.callbacks.onFeedback?.(feedback);
  }

  /**
   * Get current observation state
   */
  getState(): ObservationState | null {
    return this.state;
  }

  /**
   * Update ROI bounds
   */
  updateROIBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    if (this.state) {
      this.state.roiBounds = bounds;
    }
  }

  /**
   * Stop observation
   */
  stop(): void {
    if (this.state) {
      this.state.isActive = false;
    }
    this.lastSnapshotObservables.clear();
  }

  /**
   * Reset observation (clear timeline)
   */
  reset(): void {
    if (this.state) {
      this.state.observables.clear();
      this.state.transformations = [];
      this.state.currentStep = 1;
    }
    this.lastSnapshotObservables.clear();
  }
}

