/**
 * DAI Domain Adapters
 * Exports for all domain adapters
 */

export type {
  DomainAdapter,
  AdapterAnalysis,
  StepValidation,
} from './types';

export { SymbolicExpressionAdapter } from './SymbolicExpressionAdapter';
export { SentenceGrammarAdapter } from './SentenceGrammarAdapter';

// Factory function to get appropriate adapter for an observable
import type { Observable } from '../types';
import { SymbolicExpressionAdapter } from './SymbolicExpressionAdapter';
import { SentenceGrammarAdapter } from './SentenceGrammarAdapter';
import type { DomainAdapter } from './types';

const adapters: DomainAdapter[] = [
  new SymbolicExpressionAdapter(),
  new SentenceGrammarAdapter(),
];

/**
 * Get the appropriate adapter for an observable
 */
export function getAdapterForObservable(observable: Observable): DomainAdapter | null {
  return adapters.find(adapter => adapter.canHandle(observable)) || null;
}

/**
 * Get adapter by domain name
 */
export function getAdapterByDomain(domain: string): DomainAdapter | null {
  return adapters.find(adapter => adapter.domain === domain) || null;
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): DomainAdapter[] {
  return [...adapters];
}

