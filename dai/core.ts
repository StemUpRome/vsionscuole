/**
 * DAI Core Logic
 * Core functions for classifying observables and detecting transformations
 * 
 * Subject-agnostic: No hardcoded subject-specific logic
 */

import type { Observable, ObservableType, TransformationEvent, ObservationState } from './types';

// ==========================================
// CLASSIFY OBSERVABLE
// ==========================================
/**
 * Classifies content into an ObservableType based on patterns
 * 
 * Rules:
 * - Subject-agnostic pattern matching
 * - Returns 'unknown' if no pattern matches
 * - Confidence-based classification
 * 
 * @param content - Text content to classify
 * @returns ObservableType classification
 */
export function classifyObservable(content: string): ObservableType {
  if (!content || content.trim().length === 0) {
    return 'unknown';
  }

  const normalized = content.trim();

  // Check for symbolic_expression patterns
  // Matches: mathematical operations, equations, symbols
  if (isSymbolicExpression(normalized)) {
    return 'symbolic_expression';
  }

  // Check for list patterns
  // Matches: bullet points, numbered items, multiple lines with separators
  if (isList(normalized)) {
    return 'list';
  }

  // Check for sentence patterns
  // Matches: complete sentences with punctuation
  if (isSentence(normalized)) {
    return 'sentence';
  }

  // Check for text_block patterns
  // Matches: longer text blocks, paragraphs
  if (isTextBlock(normalized)) {
    return 'text_block';
  }

  // Check for diagram indicators
  // Matches: visual/spatial content indicators
  if (isDiagram(normalized)) {
    return 'diagram';
  }

  return 'unknown';
}

// ==========================================
// CLASSIFICATION HELPERS
// ==========================================

/**
 * Checks if content matches symbolic expression patterns
 */
function isSymbolicExpression(content: string): boolean {
  // Mathematical operators
  const mathOperators = /[+\-×*÷/=<>≤≥≠]/;
  
  // Mathematical symbols
  const mathSymbols = /[√∫∑∏πΣαβγθλμ]/;
  
  // Variable patterns (x, y, z, etc.)
  const variablePattern = /\b[a-z]\s*[=+\-×*÷/]/i;
  
  // Number with operator patterns
  const numberOperatorPattern = /\d+\s*[+\-×*÷/=<>]/;
  
  // Exponent/superscript patterns
  const exponentPattern = /\^\d+|[\u2070-\u2079]/;
  
  // Fraction patterns
  const fractionPattern = /\d+\s*\/\s*\d+/;
  
  return (
    mathOperators.test(content) ||
    mathSymbols.test(content) ||
    variablePattern.test(content) ||
    numberOperatorPattern.test(content) ||
    exponentPattern.test(content) ||
    fractionPattern.test(content)
  );
}

/**
 * Checks if content matches list patterns
 */
function isList(content: string): boolean {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Single line is unlikely to be a list
  if (lines.length < 2) {
    return false;
  }

  // Check for bullet points, dashes, numbers
  const bulletPattern = /^[\s]*[•·▪▫-]\s+/;
  const numberedPattern = /^[\s]*\d+[\.\)]\s+/;
  
  const bulletMatches = lines.filter(line => bulletPattern.test(line)).length;
  const numberedMatches = lines.filter(line => numberedPattern.test(line)).length;
  
  // If majority of lines match list patterns, it's a list
  const threshold = Math.max(1, Math.floor(lines.length * 0.5));
  return bulletMatches >= threshold || numberedMatches >= threshold;
}

/**
 * Checks if content matches sentence patterns
 */
function isSentence(content: string): boolean {
  // Complete sentence: starts with capital, ends with punctuation
  const sentencePattern = /^[A-ZÀÁÈÉÌÍÒÓÙÚ][^.!?]*[.!?]\s*$/;
  
  // Multiple sentences
  const multipleSentences = /[.!?]\s+[A-ZÀÁÈÉÌÍÒÓÙÚ]/;
  
  // Contains sentence-like structure (subject-verb-object patterns)
  const sentenceStructure = /\b[A-ZÀÁÈÉÌÍÒÓÙÚ][a-zàáèéìíòóùú]+[^.!?]*[.!?]/;
  
  return (
    sentencePattern.test(content) ||
    multipleSentences.test(content) ||
    (sentenceStructure.test(content) && content.length < 500) // Short enough to be a sentence
  );
}

/**
 * Checks if content matches text block patterns
 */
function isTextBlock(content: string): boolean {
  // Longer content with multiple sentences/paragraphs
  if (content.length < 100) {
    return false;
  }

  // Multiple paragraphs (double line breaks)
  const hasParagraphs = /\n\s*\n/.test(content);
  
  // Multiple sentences
  const sentenceCount = (content.match(/[.!?]\s+/g) || []).length;
  
  return hasParagraphs || sentenceCount >= 3;
}

/**
 * Checks if content indicates diagram/visual content
 */
function isDiagram(content: string): boolean {
  // Very short content (likely labels in diagrams)
  if (content.length < 20 && /^[A-Z0-9\s]+$/.test(content)) {
    return true;
  }
  
  // Contains diagram-related keywords
  const diagramKeywords = /\b(grafico|diagramma|schema|figura|tabella|asse|piano|retta|curva)\b/i;
  
  // Contains coordinate patterns
  const coordinatePattern = /\([\d.,\s]+\)/;
  
  // Contains geometric references
  const geometricPattern = /\b(retta|punto|angolo|triangolo|quadrato|cerchio|area|perimetro)\b/i;
  
  return diagramKeywords.test(content) || 
         coordinatePattern.test(content) || 
         geometricPattern.test(content);
}

// ==========================================
// DETECT TRANSFORMATIONS
// ==========================================
/**
 * Detects transformations by comparing two sets of observables
 * 
 * Rules:
 * - Compares observables by ID
 * - Identifies add, remove, replace, reorder
 * - Returns array of TransformationEvent
 * 
 * @param before - Previous set of observables
 * @param after - Current set of observables
 * @returns Array of detected transformation events
 */
export function detectTransformations(
  before: Map<string, Observable>,
  after: Map<string, Observable>
): TransformationEvent[] {
  const events: TransformationEvent[] = [];
  const beforeIds = new Set(before.keys());
  const afterIds = new Set(after.keys());

  // Detect ADD: observables present in after but not in before
  afterIds.forEach(id => {
    if (!beforeIds.has(id)) {
      const observable = after.get(id)!;
      events.push({
        id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transformation: 'add',
        observableId: id,
        observableType: observable.type,
        timestamp: Date.now(),
        after: observable.content,
        position: {
          x: observable.bounds.x,
          y: observable.bounds.y,
        },
        metadata: {
          bounds: observable.bounds,
          confidence: observable.confidence,
        },
      });
    }
  });

  // Detect REMOVE: observables present in before but not in after
  beforeIds.forEach(id => {
    if (!afterIds.has(id)) {
      const observable = before.get(id)!;
      events.push({
        id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transformation: 'remove',
        observableId: id,
        observableType: observable.type,
        timestamp: Date.now(),
        before: observable.content,
        position: {
          x: observable.bounds.x,
          y: observable.bounds.y,
        },
        metadata: {
          bounds: observable.bounds,
        },
      });
    }
  });

  // Detect REPLACE: same ID but different content
  beforeIds.forEach(id => {
    if (afterIds.has(id)) {
      const beforeObs = before.get(id)!;
      const afterObs = after.get(id)!;
      
      if (beforeObs.content !== afterObs.content) {
        events.push({
          id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transformation: 'replace',
          observableId: id,
          observableType: afterObs.type,
          timestamp: Date.now(),
          before: beforeObs.content,
          after: afterObs.content,
          position: {
            x: afterObs.bounds.x,
            y: afterObs.bounds.y,
          },
          metadata: {
            bounds: afterObs.bounds,
          },
        });
      }
    }
  });

  // Detect REORDER: same content items but different order (for lists)
  const reorderEvents = detectReorder(before, after);
  events.push(...reorderEvents);

  return events;
}

/**
 * Detects reorder transformations in lists
 */
function detectReorder(
  before: Map<string, Observable>,
  after: Map<string, Observable>
): TransformationEvent[] {
  const events: TransformationEvent[] = [];

  // Only check for reorder if both sets contain lists
  const beforeLists = Array.from(before.values()).filter(o => o.type === 'list');
  const afterLists = Array.from(after.values()).filter(o => o.type === 'list');

  if (beforeLists.length === 0 || afterLists.length === 0) {
    return events;
  }

  // Compare list content - if items are the same but order changed
  beforeLists.forEach(beforeList => {
    afterLists.forEach(afterList => {
      // Extract list items (lines)
      const beforeItems = beforeList.content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      const afterItems = afterList.content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Check if items are the same but order differs
      if (
        beforeItems.length === afterItems.length &&
        beforeItems.length > 1 &&
        new Set(beforeItems).size === new Set(afterItems).size &&
        !arraysEqual(beforeItems, afterItems)
      ) {
        events.push({
          id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transformation: 'reorder',
          observableId: afterList.id,
          observableType: 'list',
          timestamp: Date.now(),
          before: beforeList.content,
          after: afterList.content,
          position: {
            x: afterList.bounds.x,
            y: afterList.bounds.y,
          },
          metadata: {
            bounds: afterList.bounds,
          },
        });
      }
    });
  });

  return events;
}

/**
 * Helper: checks if two arrays have the same elements in the same order
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Creates a new Observable from content and bounds
 */
export function createObservable(
  content: string,
  bounds: { x: number; y: number; width: number; height: number },
  confidence: number = 0.8,
  metadata?: { [key: string]: unknown }
): Observable {
  return {
    id: `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: classifyObservable(content),
    content,
    bounds,
    confidence,
    detectedAt: Date.now(),
    metadata,
  };
}

/**
 * Creates a new ObservationState for a session
 */
export function createObservationState(
  sessionId: string,
  roiBounds: { x: number; y: number; width: number; height: number }
): ObservationState {
  return {
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
}

