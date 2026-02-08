'use client'

/**
 * Client TTS basato su API OpenAI (tts-1).
 * Genera un buffer audio via /api/tts e lo riproduce con HTMLAudioElement,
 * mantenendo il sync con l'interfaccia (onEnd, stopSpeaking, isCurrentlySpeaking).
 */

export type TTSVoice = 'alloy' | 'nova' | 'onyx' | 'shimmer' | 'echo' | 'fable'

type SpeakOptions = {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  /** Chiamata quando la riproduzione termina (evento ended). */
  onEnd?: () => void
  /** Voce OpenAI: nova (femminile), alloy, onyx (più profonda). */
  voice?: TTSVoice
}

let currentAudio: HTMLAudioElement | null = null
let speaking = false

function cleanupCurrent() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  speaking = false
}

export async function speak(text: string, options: SpeakOptions = {}) {
  if (typeof window === 'undefined') {
    options.onEnd?.()
    return
  }

  const t = text?.trim()
  if (!t) {
    options.onEnd?.()
    return
  }

  stopSpeaking()

  try {
    const voice = options.voice ?? 'nova'
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t, voice }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      console.warn('[TTS] API error:', err)
      options.onEnd?.()
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)

    const audio = new Audio(url)
    currentAudio = audio
    speaking = true

    if (options.volume !== undefined) {
      audio.volume = Math.max(0, Math.min(1, options.volume))
    }

    audio.onended = () => {
      cleanupCurrent()
      URL.revokeObjectURL(url)
      options.onEnd?.()
    }

    audio.onerror = () => {
      cleanupCurrent()
      URL.revokeObjectURL(url)
      options.onEnd?.()
    }

    await audio.play()
  } catch (e) {
    console.warn('[TTS] Error:', e)
    cleanupCurrent()
    options.onEnd?.()
  }
}

export function stopSpeaking() {
  if (typeof window === 'undefined') return
  cleanupCurrent()
}

export function isCurrentlySpeaking() {
  return speaking
}
