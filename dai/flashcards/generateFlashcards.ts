/**
 * Flashcard Generator
 * 
 * Genera flashcard contestuali basate sul momento e sugli errori rilevati
 */

import type { Observable } from '../types';

export interface ContextualFlashcard {
  id: string;
  question: string;
  answer: string;
  hint?: string;
  order: number; // Ordine di presentazione (1, 2, ...)
}

/**
 * Genera flashcard per una moltiplicazione con errore
 */
function generateMultiplicationFlashcards(
  expression: string
): ContextualFlashcard[] {
  const match = expression.match(/(\d+)\s*[×*]\s*(\d+)/);
  if (!match) return [];
  
  const [, a, b] = match;
  const numA = parseInt(a);
  const numB = parseInt(b);
  
  const flashcards: ContextualFlashcard[] = [];
  
  // Strategia: scomposizione per facilitare il calcolo
  if (numB === 11) {
    // Per moltiplicazioni per 11, usa la strategia A×10 + A
    flashcards.push({
      id: 'mult_step1',
      question: `Per ${numA}×${numB}, puoi pensare ${numA}×(10+1). Quanto fa ${numA}×10?`,
      answer: `${numA * 10}`,
      hint: `${numA}×10 significa ${numA} ripetuto 10 volte`,
      order: 1,
    });
    
    flashcards.push({
      id: 'mult_step2',
      question: `Ora aggiungi un altro ${numA}: ${numA * 10}+${numA} = ?`,
      answer: `${numA * 11}`,
      hint: `${numA * 10} + ${numA} = ${numA * 11}`,
      order: 2,
    });
  } else if (numB < 20) {
    // Per numeri piccoli, usa la strategia di scomposizione
    const tens = Math.floor(numB / 10) * 10;
    const ones = numB % 10;
    
    if (tens > 0) {
      flashcards.push({
        id: 'mult_step1',
        question: `Per ${numA}×${numB}, inizia con ${numA}×${tens}. Quanto fa?`,
        answer: `${numA * tens}`,
        order: 1,
      });
    }
    
    if (ones > 0) {
      flashcards.push({
        id: 'mult_step2',
        question: tens > 0 
          ? `Ora aggiungi ${numA}×${ones} = ${numA * ones}. Quanto fa ${numA * tens}+${numA * ones}?`
          : `Quanto fa ${numA}×${ones}?`,
        answer: `${numA * numB}`,
        order: 2,
      });
    }
  }
  
  return flashcards;
}

/**
 * Genera flashcard per errori grammaticali
 */
function generateGrammarFlashcards(
  detectedIssue: string
): ContextualFlashcard[] {
  // Per ora, flashcard generiche per grammatica
  // Può essere esteso in futuro con regole specifiche
  
  return [{
    id: 'grammar_check',
    question: `Nella frase che hai scritto, controlla: ${detectedIssue}`,
    answer: 'Verifica punto per punto la struttura della frase',
    order: 1,
  }];
}

/**
 * Genera flashcard contestuali basate su:
 * - Tipo di observable
 * - Problema rilevato
 * - Stato precedente e successivo
 */
export function generateContextualFlashcards(
  observable: Observable,
  detectedIssue?: {
    type: 'inconsistency' | 'error' | 'missing_step';
    description: string;
    context?: string;
  },
  _prevState?: Observable,
  _nextState?: Observable
): ContextualFlashcard[] {
  if (!detectedIssue) {
    // Nessun problema rilevato, nessuna flashcard
    return [];
  }
  
  // Flashcard per moltiplicazioni con errore
  if (observable.type === 'symbolic_expression') {
    const multMatch = observable.content.match(/(\d+)\s*[×*]\s*(\d+)\s*=\s*(\d+)/);
    if (multMatch && detectedIssue.type === 'error') {
      return generateMultiplicationFlashcards(observable.content);
    }
  }
  
  // Flashcard per grammatica
  if (observable.type === 'sentence' && detectedIssue.type === 'error') {
    return generateGrammarFlashcards(detectedIssue.description);
  }
  
  // Flashcard generica per altri tipi di errori
  if (detectedIssue.type === 'missing_step') {
    return [{
      id: 'missing_step',
      question: detectedIssue.context || 'Quale passaggio manca nel tuo ragionamento?',
      answer: 'Pensa ai passaggi intermedi necessari',
      order: 1,
    }];
  }
  
  return [];
}

/**
 * Limita il numero di flashcard generate (massimo 2)
 */
export function limitFlashcards(flashcards: ContextualFlashcard[]): ContextualFlashcard[] {
  return flashcards
    .sort((a, b) => a.order - b.order)
    .slice(0, 2);
}

