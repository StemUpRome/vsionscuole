/**
 * DAI - Didactic Augmented Intelligence
 * Core module exports
 */

// Types
export type {
  ObservableType,
  Transformation,
  Observable,
  TransformationEvent,
  ObservationState,
} from './types';

// Core functions
export {
  classifyObservable,
  detectTransformations,
  createObservable,
  createObservationState,
} from './core';

