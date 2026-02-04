/**
 * Auto Intervention Controller
 * 
 * Determines when and how to automatically intervene during live observation
 * Teacher-like, minimal, voice + text
 * 
 * RULES:
 * - Audio is allowed ONLY in state="doubt" (high probability of error/suspicious/incoherent)
 * - Audio must be max 1 sentence, < 2.5 seconds
 * - Step completed = NO audio, text only
 */

/// <reference types="node" />

import type { ObservableType } from './types';
import type { MeaningfulEvent } from './meaningfulEvents';

export type InterventionReason = 'step_completed' | 'doubt';

/**
 * Doubt reason classification (enum)
 */
export type DoubtReason =
  | 'low_confidence'
  | 'sign_uncertain'
  | 'result_suspicious'
  | 'multiple_items'
  | 'step_incomplete'
  | 'repeated_change';

export interface Intervention {
  reason: InterventionReason;
  text: string;          // 1-2 sentences max (for text display)
  question: string;      // 1 question only (for text display)
  speak: boolean;        // whether to TTS (ONLY for doubt state)
  audioPhrase?: string;  // SHORT phrase for audio (max 1 sentence, < 2.5s)
  doubtReason?: DoubtReason; // Specific reason for doubt state
  suggestedToolId?: string;
}

/**
 * Snapshot analysis result for hysteresis tracking
 */
export interface SnapshotAnalysis {
  timestamp: number;
  doubtReasons: DoubtReason[];
  confidence: number;
}

interface ShouldInterveneParams {
  liveIntent: string;                // from live state machine
  toolOpen: boolean;
  lastInterventionAt: number | null;
  lastAudioAt: number | null;        // Track last AUDIO intervention separately for 12s cooldown
  now: number;
  analysis: {
    rawText: string;
    normalized: any;
    confidence: number;
    observableType?: ObservableType;
    signConfidence?: number;         // Optional sign confidence for sign_uncertain check
  };
  prevState?: {
    rawText: string;
    confidence: number;
  };
  meaningfulEvents?: MeaningfulEvent[];
  _motionScore: number;
  lastSpokenPhrase?: string;         // For audio deduplication
  lastSpokenReason?: DoubtReason;    // Last spoken doubt reason (for ban/dedupe)
  lastSpokenByReason?: Map<DoubtReason, number>; // Per-reason cooldown timestamps (45s)
  recentSnapshots?: SnapshotAnalysis[]; // Last 3 snapshots for hysteresis (must persist >=2)
  roiStable?: boolean;               // ROI stability check (required for hysteresis)
  lastTextFeedbackHash?: string;     // Hash of last text feedback emitted
  lastTextFeedbackAt?: number | null; // Timestamp of last text feedback
  lastSnapshotFingerprint?: string;  // Fingerprint of last snapshot processed
  lastSnapshotAt?: number | null;    // Timestamp of last snapshot
  snapshotFingerprint?: string;      // Current snapshot fingerprint (computed from observation)
}

const MIN_GAP_MS = 12000; // 12 seconds minimum between AUDIO interventions (increased from 9s)
const TEXT_COOLDOWN_MS = 10000; // 10 seconds minimum between TEXT feedback (to avoid spam)
const TEXT_SIMILARITY_THRESHOLD = 0.9; // Skip if audio phrase too similar to last spoken (for deduplication)
const AUDIO_MAX_CHARS = 60; // Approx max characters for < 2.5s audio
// const _SNAPSHOT_FINGERPRINT_THRESHOLD = 0.95; // Skip if snapshot fingerprint is too similar (95% identical) - unused
const SEVERITY_DELTA_THRESHOLD = 0.3; // Minimum severity increase to trigger intervention despite same fingerprint

/**
 * Calculate text similarity (simple Jaccard similarity on words)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Normalize text for hashing (remove extra whitespace, lowercase)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Generate hash for text feedback (simple hash for deduplication)
 */
export function hashText(text: string): string {
  const normalized = normalizeText(text);
  // Simple hash function (FNV-1a inspired, simplified)
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Generate fingerprint for snapshot observation
 * Uses normalized expression or stable string representation
 */
export function fingerprintSnapshot(params: {
  rawText: string;
  normalized?: any;
  observableType?: ObservableType;
  confidence: number;
}): string {
  const { rawText, normalized, observableType, confidence } = params;
  
  // Use normalized if available, otherwise normalize rawText
  const content = normalized 
    ? (typeof normalized === 'string' ? normalized : JSON.stringify(normalized))
    : normalizeText(rawText);
  
  // Include observable type and confidence in fingerprint
  const fingerprint = `${observableType || 'unknown'}|${content}|${confidence.toFixed(2)}`;
  
  // Hash it for consistency
  return hashText(fingerprint);
}

/**
 * Check if text feedback should be emitted (deduplication + cooldown)
 */
export function shouldEmitTextFeedback(params: {
  text: string;
  lastTextFeedbackHash?: string;
  lastTextFeedbackAt?: number | null;
  now: number;
}): { shouldEmit: boolean; reason?: string } {
  const { text, lastTextFeedbackHash, lastTextFeedbackAt, now } = params;
  
  const currentHash = hashText(text);
  
  // Check if identical to last feedback
  if (lastTextFeedbackHash === currentHash && lastTextFeedbackAt !== null && lastTextFeedbackAt !== undefined) {
    const timeSinceLastText = now - lastTextFeedbackAt;
    if (timeSinceLastText < TEXT_COOLDOWN_MS) {
      return { shouldEmit: false, reason: 'SKIP: same feedback (text dedup)' };
    }
  }
  
  // Check semantic similarity to last feedback
  if (lastTextFeedbackHash && lastTextFeedbackAt !== null && lastTextFeedbackAt !== undefined) {
    const timeSinceLastText = now - lastTextFeedbackAt;
    // Only check similarity if within cooldown window
    if (timeSinceLastText < TEXT_COOLDOWN_MS * 2) {
      // We'd need to store the last text to compare, but for now hash is sufficient
      // If hash matches, we already handled it above
    }
  }
  
  return { shouldEmit: true };
}

/**
 * Check if should react to snapshot based on fingerprint (novelty gate)
 */
export function shouldReactToSnapshot(params: {
  snapshotFingerprint: string;
  lastSnapshotFingerprint?: string;
  lastSnapshotAt?: number | null;
  now: number;
  doubtSeverity: number; // Current doubt severity (0-1)
  prevDoubtSeverity?: number; // Previous doubt severity (0-1)
}): { shouldReact: boolean; reason?: string } {
  const { snapshotFingerprint, lastSnapshotFingerprint, lastSnapshotAt, doubtSeverity, prevDoubtSeverity } = params;
  
  // If no previous snapshot, always react
  if (!lastSnapshotFingerprint || lastSnapshotAt === null || lastSnapshotAt === undefined) {
    return { shouldReact: true, reason: 'EMIT: first snapshot' };
  }
  
  // If fingerprint changed, react
  if (snapshotFingerprint !== lastSnapshotFingerprint) {
    return { shouldReact: true, reason: 'EMIT: fingerprint changed' };
  }
  
  // If fingerprint is same but severity increased significantly, react
  if (prevDoubtSeverity !== undefined) {
    const severityDelta = doubtSeverity - prevDoubtSeverity;
    if (severityDelta >= SEVERITY_DELTA_THRESHOLD) {
      return { shouldReact: true, reason: `EMIT: severity increased (delta=${severityDelta.toFixed(2)})` };
    }
  }
  
  // Otherwise, skip (same snapshot, no significant severity change)
  return { shouldReact: false, reason: 'SKIP: same fingerprint, no severity change' };
}

/**
 * Check for numeric inconsistency in multiplication expressions
 * IMPORTANT: Only check if confidence >= 0.6 (reduce false positives)
 */
function checkMultiplicationInconsistency(content: string, confidence: number): { hasError: boolean; message?: string } {
  // Rule 5: If confidence < 0.6 => do NOT infer operation type/result
  if (confidence < 0.6) {
    return { hasError: false };
  }

  // Pattern: A×B=C or A*B=C
  const multMatch = content.match(/(\d+)\s*[×*]\s*(\d+)\s*=\s*(\d+)/);
  if (!multMatch) return { hasError: false };
  
  const [, a, b, resultStr] = multMatch;
  const numA = parseInt(a);
  const numB = parseInt(b);
  const detectedResult = parseInt(resultStr);
  const correctResult = numA * numB;
  
  // Only check for small integers (< 1000) to avoid false positives
  if (numA > 100 || numB > 100 || detectedResult > 10000) {
    return { hasError: false };
  }
  
  if (detectedResult !== correctResult) {
    return {
      hasError: true,
      message: `Il risultato ${detectedResult} non corrisponde all'operazione ${numA}×${numB}`,
    };
  }
  
  return { hasError: false };
}

/**
 * Detect sign uncertainty (ambiguous operation symbols)
 */
function detectSignUncertainty(content: string): boolean {
  // Check for ambiguous or unclear operation signs
  // Patterns that suggest uncertainty: mixed signs, unclear symbols, etc.
  const ambiguousPatterns = [
    /[+\-×*÷]\s*[?~≈]/,  // Sign followed by uncertainty markers
    /[?~≈]\s*[+\-×*÷]/,  // Uncertainty markers before sign
    /\s{2,}[+\-×*÷]\s{2,}/, // Signs with excessive spacing (unclear)
  ];
  
  return ambiguousPatterns.some(pattern => pattern.test(content));
}

/**
 * Teacher-like AUDIO phrases mapped by doubtReason
 * MUST be short, human, max 1 sentence, < 2.5 seconds
 * NO explanations, NO narrations, NO result disclosure
 */
/**
 * Teacher-like AUDIO phrases mapped by doubtReason
 * Audio = interruption only ("Aspetta un attimo…", "Fermiamoci qui…")
 * MUST be short, human, max 1 sentence, < 2.5 seconds
 * NO explanations, NO narrations, NO result disclosure
 */
const DOUBT_AUDIO_PHRASES: Record<DoubtReason, string> = {
  low_confidence: '', // Text only (no audio by default policy)
  sign_uncertain: '', // Text only (unless specific conditions met)
  result_suspicious: 'Aspetta un attimo… ricontrolliamo.', // Audio allowed
  multiple_items: 'Fermiamoci qui.', // Audio allowed
  step_incomplete: '', // Text only (no audio by default policy)
  repeated_change: '', // Text only (no audio by default policy)
};

/**
 * Teacher-like TEXT phrases for doubt state
 * Text = actionable micro-step, max 1 line
 */
const DOUBT_TEXT_PHRASES: Record<DoubtReason, string> = {
  low_confidence: 'Non leggo bene. Avvicina il foglio e riscrivi più grande.',
  sign_uncertain: 'Non vedo bene il segno. Riscrivilo più chiaro.',
  result_suspicious: 'Rifai il calcolo partendo dalle unità.',
  multiple_items: 'Controlla questo passaggio passo per passo.',
  step_incomplete: 'Scrivi il prossimo passaggio.',
  repeated_change: 'Ricontrolla dall\'inizio.',
};

/**
 * Audio policy: Which doubt reasons are allowed to speak (by default)
 */
const AUDIO_ALLOWED_REASONS: Set<DoubtReason> = new Set(['result_suspicious', 'multiple_items']);

/**
 * Per-reason cooldown (45 seconds)
 */
const PER_REASON_COOLDOWN_MS = 45000;

/**
 * Teacher-like phrases for step completed
 * @deprecated Unused - commented out to fix build
 */
// const _STEP_COMPLETED_PHRASES = [
//   'Ok, questo passaggio sembra completo.',
//   'Bene, hai finito questo step.',
//   'Perfetto, hai completato questo punto.',
// ];

const FOLLOW_UP_QUESTIONS = {
  step_completed: [
    'Vuoi fare una verifica veloce prima di andare avanti?',
    'Vuoi controllare se tutto è corretto?',
    'Ti va di verificare questo passaggio?',
  ],
  doubt: [
    'Puoi controllare questo punto?',
    'Vuoi rivedere questo calcolo?',
    'Possiamo verificare insieme?',
  ],
};

/**
 * Select random phrase from array
 */
function getRandomPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Detect doubt reasons from current analysis
 * This is extracted to be used both in shouldIntervene and for snapshot tracking
 */
export function detectDoubtReasons(params: {
  analysis: {
    rawText: string;
    confidence: number;
    observableType?: ObservableType;
    signConfidence?: number;
  };
  meaningfulEvents?: MeaningfulEvent[];
}): DoubtReason[] {
  const { analysis, meaningfulEvents = [] } = params;
  const currentDoubtReasons: DoubtReason[] = [];
  
  // Doubt: Low confidence (0.6 <= confidence < 0.7)
  if (analysis.confidence >= 0.6 && analysis.confidence < 0.7) {
    currentDoubtReasons.push('low_confidence');
  }

  // Doubt: Sign uncertainty
  // Rule 2: Only trigger if signConfidence is in [0.45,0.65] range
  if (analysis.signConfidence !== undefined) {
    if (detectSignUncertainty(analysis.rawText) && analysis.signConfidence >= 0.45 && analysis.signConfidence <= 0.65) {
      currentDoubtReasons.push('sign_uncertain');
    }
  } else if (detectSignUncertainty(analysis.rawText)) {
    // Fallback: if signConfidence not available, use detection only (but won't trigger audio)
    currentDoubtReasons.push('sign_uncertain');
  }

  // Doubt: Result suspicious (numeric inconsistency in symbolic expressions)
  // Only check if confidence >= 0.6
  if (analysis.observableType === 'symbolic_expression') {
    const multCheck = checkMultiplicationInconsistency(analysis.rawText, analysis.confidence);
    if (multCheck.hasError) {
      currentDoubtReasons.push('result_suspicious');
    }
  }

  // Doubt: Multiple items/corrections detected
  const correctionCount = meaningfulEvents.filter(e => e.type === 'correction_detected').length;
  if (correctionCount >= 2) {
    currentDoubtReasons.push('multiple_items');
  }

  // Doubt: Repeated changes (many transformations of same type)
  const recentTransformations = meaningfulEvents.filter(e => 
    e.type === 'correction_detected' || e.type === 'annotation_detected'
  );
  if (recentTransformations.length >= 3) {
    currentDoubtReasons.push('repeated_change');
  }

  // Doubt: Step incomplete (detection based on observable structure)
  if (analysis.observableType === 'symbolic_expression' && !analysis.rawText.includes('=')) {
    currentDoubtReasons.push('step_incomplete');
  }

  return currentDoubtReasons;
}

/**
 * Determines if an automatic intervention should occur
 */
export function shouldIntervene(params: ShouldInterveneParams): Intervention | null {
  const {
    liveIntent,
    toolOpen,
    lastAudioAt,
    now,
    analysis,
    prevState,
    meaningfulEvents = [],
    lastSpokenPhrase,
    lastSpokenReason,
    recentSnapshots,
    lastTextFeedbackHash,
    lastTextFeedbackAt,
    lastSnapshotFingerprint,
    lastSnapshotAt,
    snapshotFingerprint,
  } = params;

  // Rule 1: Never intervene while writing
  if (liveIntent === 'writing_in_progress') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DAI] SKIP: writing_in_progress');
    }
    return null;
  }

  // Gate B: Check snapshot fingerprint novelty (if provided)
  if (snapshotFingerprint) {
    // Compute doubt severity (simple: based on confidence and doubt reasons count)
    const currentDoubtReasons = detectDoubtReasons({ analysis, meaningfulEvents });
    const doubtSeverity = currentDoubtReasons.length > 0 ? (1 - analysis.confidence) : 0;
    const prevDoubtSeverity = recentSnapshots && recentSnapshots.length > 0 
      ? (1 - (recentSnapshots[recentSnapshots.length - 1].confidence || 0.8))
      : undefined;
    
    const snapshotGate = shouldReactToSnapshot({
      snapshotFingerprint,
      lastSnapshotFingerprint,
      lastSnapshotAt,
      now,
      doubtSeverity,
      prevDoubtSeverity,
    });
    
    if (!snapshotGate.shouldReact) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DAI] ${snapshotGate.reason}`);
      }
      return null; // Skip: same fingerprint, no novelty
    }
    
    if (process.env.NODE_ENV === 'development' && snapshotGate.reason?.startsWith('EMIT')) {
      console.log(`[DAI] ${snapshotGate.reason}`);
    }
  }

  // Rule 2: Cooldown check for AUDIO interventions (12 seconds)
  // Note: Text-only interventions can happen more frequently, but audio requires 12s cooldown
  // This check is applied later, only for doubt state interventions

  // Rule 3: De-duplicate by text similarity
  if (prevState && calculateTextSimilarity(analysis.rawText, prevState.rawText) > TEXT_SIMILARITY_THRESHOLD) {
    return null;
  }

  // Rule 4: Very low confidence -> ask to reframe ROI instead of guessing
  // This is NOT a doubt state, just a technical issue (text only, no audio)
  if (analysis.confidence < 0.6) {
    const lowConfidenceText = 'Non leggo bene. Avvicina il foglio e riscrivi più grande.';
    
    // Check text feedback gate
    const textFeedbackGate = shouldEmitTextFeedback({
      text: lowConfidenceText,
      lastTextFeedbackHash,
      lastTextFeedbackAt,
      now,
    });
    
    if (!textFeedbackGate.shouldEmit) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DAI] ${textFeedbackGate.reason}`);
      }
      return null; // Skip: same feedback within cooldown
    }
    
    return {
      reason: 'step_completed', // Not doubt, just info
      text: lowConfidenceText,
      question: 'Vuoi riprovare?',
      speak: false, // NO audio for ROI issues (text only)
      suggestedToolId: undefined,
    };
  }

  // Rule 5: Detect doubt reasons from current snapshot
  const currentDoubtReasons = detectDoubtReasons({ 
    analysis: {
      ...analysis,
      signConfidence: analysis.signConfidence, // Pass through signConfidence if available
    }, 
    meaningfulEvents 
  });

  // Rule 2: Enter doubt ONLY when doubtReason persists for >=2 of last 3 snapshots (hysteresis)
  // AND ROI is stable
  const recentSnapshotsList = recentSnapshots || [];
  
  // Rule 5: Strengthen hysteresis - require stable ROI
  if (params.roiStable === false) {
    return null; // ROI not stable, ignore doubt
  }
  
  const allRecentReasons = [
    ...recentSnapshotsList.map(s => s.doubtReasons).flat(),
    ...currentDoubtReasons,
  ];

  // Count occurrences of each doubt reason in last 3 snapshots (including current)
  const reasonCounts: Map<DoubtReason, number> = new Map();
  for (const reason of allRecentReasons) {
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
  }

  // Find reasons that appear >=2 times (persistent)
  const persistentReasons = Array.from(reasonCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([reason]) => reason);

  // Rule 2: Enter doubt ONLY if we have persistent reasons AND stable ROI
  if (persistentReasons.length === 0) {
    return null; // No persistent doubt, skip intervention
  }

  // Use the most frequent persistent reason (or first if tie)
  const primaryDoubtReason = persistentReasons[0];

  // Rule 6: If tool open, only allow doubt interventions with persistent reasons
  if (toolOpen && persistentReasons.length === 0) {
    return null; // No intervention if tool open and no persistent doubt
  }

  // Generate DOUBT intervention (state="doubt")
  // We have persistent reasons, proceed with intervention
  
  // Text question: mapped by doubtReason (always shown)
  const textQuestion = DOUBT_TEXT_PHRASES[primaryDoubtReason];
  
  // Rule 1: Audio policy - speak ONLY for doubtReason in {"result_suspicious","multiple_items"} by default
  const isAudioAllowedByPolicy = AUDIO_ALLOWED_REASONS.has(primaryDoubtReason);
  
  // Rule 2: Special case for sign_uncertain - only audio if signConfidence in [0.45,0.65]
  let isAudioAllowed = isAudioAllowedByPolicy;
  if (primaryDoubtReason === 'sign_uncertain') {
    const signConfidence = analysis.signConfidence;
    if (signConfidence !== undefined && signConfidence >= 0.45 && signConfidence <= 0.65) {
      isAudioAllowed = true; // Special case: allow audio for sign_uncertain with specific confidence range
    } else {
      isAudioAllowed = false; // Otherwise text only
    }
  }
  
  // Rule 3: Per-reason cooldown (45 seconds)
  const lastSpokenByReasonMap = params.lastSpokenByReason || new Map<DoubtReason, number>();
  const lastSpokenForReason = lastSpokenByReasonMap.get(primaryDoubtReason);
  if (lastSpokenForReason !== undefined && (now - lastSpokenForReason) < PER_REASON_COOLDOWN_MS) {
    isAudioAllowed = false; // Per-reason cooldown not met, text only
  }
  
  // Rule 2 (recheck): Global cooldown for AUDIO interventions (12 seconds)
  if (isAudioAllowed && lastAudioAt !== null && (now - lastAudioAt) < MIN_GAP_MS) {
    isAudioAllowed = false; // Global cooldown not met, text only
  }
  
  // If audio not allowed, return text-only intervention (text gate already passed above)
  if (!isAudioAllowed) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DAI] EMIT: reason=${primaryDoubtReason}, severity=${(1 - analysis.confidence).toFixed(2)}, audio=false`);
    }
    return {
      reason: 'doubt',
      text: textQuestion, // Actionable micro-step, max 1 line
      question: textQuestion,
      speak: false, // Text only
      doubtReason: primaryDoubtReason,
      suggestedToolId: analysis.observableType === 'symbolic_expression' ? 'number_line' : undefined,
    };
  }

  // Audio is allowed - get audio phrase
  let audioPhrase = DOUBT_AUDIO_PHRASES[primaryDoubtReason];
  
  // Special case for sign_uncertain: Only use audio phrase if conditions met
  if (primaryDoubtReason === 'sign_uncertain') {
    // Audio phrase for sign_uncertain (only if signConfidence in range)
    audioPhrase = 'Non vedo bene il segno. Puoi riscriverlo?';
  }
  
  // Rule 4 (Hard ban): Never speak "Aspetta" twice in a row
  if (lastSpokenPhrase && lastSpokenPhrase.toLowerCase().startsWith('aspetta')) {
    if (audioPhrase.toLowerCase().startsWith('aspetta')) {
      // Both start with "Aspetta", use text-only
      return {
        reason: 'doubt',
        text: textQuestion,
        question: textQuestion,
        speak: false, // Hard ban: cannot speak "Aspetta" twice in a row
        doubtReason: primaryDoubtReason,
        suggestedToolId: analysis.observableType === 'symbolic_expression' ? 'number_line' : undefined,
      };
    }
  }

  // Rule 7: Deduplication - if too similar to last spoken AND same reason, skip audio
  if (lastSpokenPhrase && lastSpokenReason === primaryDoubtReason) {
    if (calculateTextSimilarity(audioPhrase, lastSpokenPhrase) > TEXT_SIMILARITY_THRESHOLD) {
      // Too similar with same reason, return text-only
      return {
        reason: 'doubt',
        text: textQuestion,
        question: textQuestion,
        speak: false, // Deduplication: no audio (too similar + same reason)
        doubtReason: primaryDoubtReason,
        suggestedToolId: analysis.observableType === 'symbolic_expression' ? 'number_line' : undefined,
      };
    }
  }
  
  // Enforce max length for audio (< 2.5s)
  audioPhrase = audioPhrase.substring(0, AUDIO_MAX_CHARS);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DAI] EMIT: reason=${primaryDoubtReason}, severity=${(1 - analysis.confidence).toFixed(2)}, audio=true`);
  }
  
  return {
    reason: 'doubt',
    text: textQuestion, // Actionable micro-step, max 1 line
    question: textQuestion,
    speak: true, // Audio allowed
    audioPhrase, // Short interruption phrase (< 2.5s)
    doubtReason: primaryDoubtReason, // Store the specific reason
    suggestedToolId: analysis.observableType === 'symbolic_expression' ? 'number_line' : undefined,
  };

  // Rule 7: Check for step completed (correct progress)
  const hasNewObservation = meaningfulEvents.some(e => e.type === 'new_observation');
  const hasCompletionIndicator = 
    analysis.rawText.includes('=') || // Equation completed
    analysis.rawText.split('\n').length >= 3; // Multi-line completed

  if (hasNewObservation && hasCompletionIndicator) {
    // Step completed - NO AUDIO, optional short text only
    const question = getRandomPhrase(FOLLOW_UP_QUESTIONS.step_completed);
    
    // Check text feedback gate
    const textFeedbackGate = shouldEmitTextFeedback({
      text: question,
      lastTextFeedbackHash,
      lastTextFeedbackAt,
      now,
    });
    
    if (!textFeedbackGate.shouldEmit) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DAI] ${textFeedbackGate.reason}`);
      }
      return null; // Skip: same feedback within cooldown
    }
    
    return {
      reason: 'step_completed',
      text: question, // Short optional text
      question,
      speak: false, // MANDATORY: Step completed = NO audio
      suggestedToolId: undefined,
    };
  }

  // No intervention needed
  return null;
}

/**
 * Format intervention message for UI display
 */
export function formatInterventionMessage(intervention: Intervention): string {
  return `${intervention.text}\n\n${intervention.question}`;
}
