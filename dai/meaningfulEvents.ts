/**
 * Meaningful Events
 * 
 * Filtra le trasformazioni raw per mostrare solo eventi significativi
 * e ridurre il rumore di centinaia di add/remove.
 */

import type { TransformationEvent, ObservableType } from './types';

export type MeaningfulEventType =
  | 'new_observation'      // Nuova osservazione aggiunta
  | 'correction_detected'  // Correzione rilevata
  | 'annotation_detected'  // Annotazione aggiunta
  | 'classification_detected' // Classificazione cambiata
  | 'duplicate_ignored'    // Duplicato ignorato
  | 'step_completed';      // Step completato

export interface MeaningfulEvent {
  id: string;
  type: MeaningfulEventType;
  timestamp: number;
  description: string;
  observableType: ObservableType;
  observableId?: string;
}

/**
 * Mappa una trasformazione raw in un evento significativo (o null se non significativo)
 */
export function mapToMeaningfulEvent(
  event: TransformationEvent,
  prevEvents: TransformationEvent[],
  allObservables: Map<string, any>
): MeaningfulEvent | null {
  const { transformation, observableId, observableType, timestamp } = event;

  // Nuova osservazione (primo add di un observable)
  if (transformation === 'add') {
    const isFirstAdd = !prevEvents.some(e => 
      e.observableId === observableId && e.transformation === 'add'
    );
    
    if (isFirstAdd) {
      const observable = allObservables.get(observableId);
      const contentPreview = observable?.content?.substring(0, 30) || 'contenuto';
      
      return {
        id: `new_${observableId}`,
        type: 'new_observation',
        timestamp,
        description: `Nuova osservazione: ${contentPreview}${observable?.content?.length > 30 ? '...' : ''}`,
        observableType,
        observableId,
      };
    }
    
    // Ignora add duplicati
    return {
      id: `dup_${event.id}`,
      type: 'duplicate_ignored',
      timestamp,
      description: 'Osservazione duplicata ignorata',
      observableType,
      observableId,
    };
  }

  // Correzione rilevata (replace con cambiamento significativo)
  if (transformation === 'replace' && event.before && event.after) {
    const beforeClean = event.before.trim();
    const afterClean = event.after.trim();
    
    // Se il contenuto è cambiato in modo significativo (non solo spazi)
    if (beforeClean !== afterClean && beforeClean.length > 0) {
      return {
        id: `corr_${event.id}`,
        type: 'correction_detected',
        timestamp,
        description: `Correzione: "${beforeClean.substring(0, 20)}" → "${afterClean.substring(0, 20)}"`,
        observableType,
        observableId,
      };
    }
  }

  // Annotazione aggiunta
  if (transformation === 'annotate') {
    return {
      id: `annot_${event.id}`,
      type: 'annotation_detected',
      timestamp,
      description: 'Annotazione aggiunta',
      observableType,
      observableId,
    };
  }

  // Classificazione cambiata
  if (transformation === 'classify') {
    return {
      id: `class_${event.id}`,
      type: 'classification_detected',
      timestamp,
      description: `Classificato come: ${observableType}`,
      observableType,
      observableId,
    };
  }

  // Rimozione (potrebbe essere significativa se c'è stato un add prima)
  if (transformation === 'remove') {
    const hadAdd = prevEvents.some(e => 
      e.observableId === observableId && e.transformation === 'add'
    );
    
    if (hadAdd) {
      return {
        id: `rem_${event.id}`,
        type: 'step_completed',
        timestamp,
        description: 'Elemento rimosso (step completato)',
        observableType,
        observableId,
      };
    }
  }

  // Ignora tutto il resto (add/remove spam)
  return null;
}

/**
 * Filtra una lista di trasformazioni raw e restituisce solo eventi significativi
 */
export function filterMeaningfulEvents(
  rawTransformations: TransformationEvent[],
  allObservables: Map<string, any>
): MeaningfulEvent[] {
  const meaningful: MeaningfulEvent[] = [];
  
  for (let i = 0; i < rawTransformations.length; i++) {
    const event = rawTransformations[i];
    const prevEvents = rawTransformations.slice(0, i);
    
    const meaningfulEvent = mapToMeaningfulEvent(event, prevEvents, allObservables);
    
    if (meaningfulEvent && meaningfulEvent.type !== 'duplicate_ignored') {
      meaningful.push(meaningfulEvent);
    }
  }
  
  return meaningful;
}

/**
 * Conta eventi significativi per tipo
 */
export function countMeaningfulEvents(events: MeaningfulEvent[]): {
  new_observation: number;
  correction_detected: number;
  annotation_detected: number;
  classification_detected: number;
  step_completed: number;
  total: number;
} {
  return {
    new_observation: events.filter(e => e.type === 'new_observation').length,
    correction_detected: events.filter(e => e.type === 'correction_detected').length,
    annotation_detected: events.filter(e => e.type === 'annotation_detected').length,
    classification_detected: events.filter(e => e.type === 'classification_detected').length,
    step_completed: events.filter(e => e.type === 'step_completed').length,
    total: events.length,
  };
}

