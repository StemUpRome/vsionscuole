/**
 * DAI - Didactic Augmented Intelligence
 * Core types for process-aware live observation system
 * 
 * KEY RULES:
 * - Subject-agnostic (no hardcoded subjects)
 * - One intervention per step
 * - Guide, never solve
 * - BES-friendly language
 */

// ==========================================
// OBSERVABLE TYPE
// ==========================================
/**
 * Type of observable content detected in the ROI
 */
export type ObservableType =
  | 'symbolic_expression'  // Mathematical expressions, formulas: 2x + 3 = 7, √16, ∫f(x)dx
  | 'sentence'             // Complete sentences: "Il gatto è sul tappeto"
  | 'text_block'           // Paragraphs or blocks of text
  | 'list'                 // Ordered/unordered lists, bullet points, items
  | 'diagram'              // Diagrams, graphs, geometric figures, schemas
  | 'unknown';             // Undetermined type

// ==========================================
// TRANSFORMATION
// ==========================================
/**
 * Types of transformations that can be detected
 */
export type Transformation =
  | 'add'                  // Addition of new content
  | 'remove'               // Removal of existing content
  | 'replace'              // Replacement of content
  | 'reorder'              // Reordering (lists, steps, sequences)
  | 'annotate'             // Addition of annotations (notes, comments)
  | 'classify'             // Classification/categorization
  | 'highlight';           // Highlighting (without content modification)

// ==========================================
// OBSERVABLE
// ==========================================
/**
 * Represents a single observable element detected in the ROI
 */
export interface Observable {
  id: string;                    // Unique identifier
  type: ObservableType;          // Type of observable
  content: string;               // Textual/OCR content
  bounds: {                      // Position in ROI (normalized coordinates 0-1)
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;            // Detection confidence (0-1)
  detectedAt: number;            // Detection timestamp (milliseconds)
  metadata?: {                   // Additional metadata (subject-agnostic)
    [key: string]: unknown;
  };
}

// ==========================================
// TRANSFORMATION EVENT
// ==========================================
/**
 * Records a detected transformation event
 */
export interface TransformationEvent {
  id: string;                    // Unique identifier
  transformation: Transformation; // Type of transformation
  observableId: string;          // ID of the observable that was transformed
  observableType: ObservableType; // Type of the observable
  timestamp: number;             // Event timestamp (milliseconds)
  before?: string;               // Previous state (if applicable)
  after?: string;                // New state (if applicable)
  position?: {                   // Position of transformation in ROI
    x: number;
    y: number;
  };
  metadata?: {                   // Additional metadata
    [key: string]: unknown;
  };
}

// ==========================================
// OBSERVATION STATE
// ==========================================
/**
 * Represents the current state of the observation session
 */
export interface ObservationState {
  sessionId: string;             // Unique session identifier
  startTime: number;             // Session start timestamp (milliseconds)
  observables: Map<string, Observable>;  // Current observables (id -> Observable)
  transformations: TransformationEvent[]; // History of transformations
  currentStep: number;           // Current step in the didactic process
  isActive: boolean;             // Whether observation is active
  roiBounds: {                   // Current ROI bounds (normalized 0-1)
    x: number;
    y: number;
    width: number;
    height: number;
  };
  lastSnapshotTime: number;      // Last snapshot timestamp (milliseconds)
  motionDetected: boolean;       // Whether motion was detected
}

