/**
 * DAI Live Vision
 * Client-side live vision components and utilities
 */

// Components
export { LiveModeToggle } from './components/LiveModeToggle';
export { RoiSelectorOverlay } from './components/RoiSelectorOverlay';

// Hooks
export { useMotionDetector } from './hooks/useMotionDetector';
export { useStabilizationTrigger } from './hooks/useStabilizationTrigger';

// Utilities
export { captureRoiSnapshot } from './captureRoiSnapshot';

// Types
export type { MotionDetectionResult, UseMotionDetectorOptions } from './hooks/useMotionDetector';
export type { StabilizationConfig, UseStabilizationTriggerOptions } from './hooks/useStabilizationTrigger';
export type { RoiSnapshot, CaptureRoiSnapshotOptions } from './captureRoiSnapshot';
export type { LiveModeToggleProps } from './components/LiveModeToggle';
export type { RoiSelectorOverlayProps } from './components/RoiSelectorOverlay';

