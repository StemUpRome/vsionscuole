'use client'

/**
 * Stub minimale del client TTS usato dalla Room.
 * In futuro si può collegare a un vero servizio TTS.
 */

type SpeakOptions = {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  onEnd?: () => void
}

export async function speak(text: string, options: SpeakOptions = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis non disponibile in questo ambiente.')
    options.onEnd?.()
    return
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options.lang ?? 'it-IT'
  if (options.rate) utterance.rate = options.rate
  if (options.pitch) utterance.pitch = options.pitch
  if (options.volume !== undefined) utterance.volume = options.volume
  if (options.onEnd) utterance.onend = () => options.onEnd!()

  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
}

export function isCurrentlySpeaking() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  // Non esiste una API diretta, ma possiamo approssimare
  return window.speechSynthesis.speaking
}

