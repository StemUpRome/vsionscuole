/**
 * DAI Observation Panel
 * Portato da VsionAI/src/components/DAIObservationPanel.tsx
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import type { ObservationState, TransformationEvent } from '../dai/types'
import type { MeaningfulEvent } from '../dai/meaningfulEvents'
import { countMeaningfulEvents } from '../dai/meaningfulEvents'

interface DAIObservationPanelProps {
  state: ObservationState | null
  meaningfulEvents?: MeaningfulEvent[]
  isVisible?: boolean
  onClose?: () => void
  autoInterventionEnabled?: boolean
  onToggleAutoIntervention?: () => void
  ttsEnabled?: boolean
  onToggleTTS?: () => void
}

export default function DAIObservationPanel({
  state,
  meaningfulEvents = [],
  isVisible = false,
  onClose,
  autoInterventionEnabled = true,
  onToggleAutoIntervention,
  ttsEnabled = true,
  onToggleTTS,
}: DAIObservationPanelProps) {
  const [showDebug, setShowDebug] = useState(false)
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('dai-panel-minimized')
    return saved === 'true'
  })
  const [bottomOffset, setBottomOffset] = useState(120)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateOffset = () => {
      const chatInput = document.querySelector('input[placeholder*=\"Rispondi\"]') as HTMLInputElement | null
      if (chatInput) {
        const inputRect = chatInput.getBoundingClientRect()
        const inputHeight = inputRect.height
        const padding = 16
        const newOffset = inputHeight + padding + 16
        setBottomOffset(newOffset)
      } else {
        setBottomOffset(120)
      }
    }

    updateOffset()
    window.addEventListener('resize', updateOffset)
    const interval = window.setInterval(updateOffset, 1000)

    return () => {
      window.removeEventListener('resize', updateOffset)
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('dai-panel-minimized', isMinimized.toString())
  }, [isMinimized])

  if (!isVisible || !state) return null

  const observablesCount = state.observables.size
  const rawTransformationsCount = state.transformations.length
  const sessionDuration = Math.floor((Date.now() - state.startTime) / 1000)

  const meaningfulCounts = countMeaningfulEvents(meaningfulEvents)
  const meaningfulTotal = meaningfulCounts.total

  return (
    <div
      ref={panelRef}
      className="fixed right-4 bg-[#1e1e2e] border border-[#6366F1]/30 rounded-xl shadow-2xl z-40 max-w-sm backdrop-blur-md"
      style={{
        bottom: `${bottomOffset}px`,
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`${isMinimized ? 'p-2' : 'p-4'} transition-all`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#6366F1] uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 bg-[#6366F1] rounded-full animate-pulse" />
            DAI Observation
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-gray-400 hover:text-white transition-colors text-xs"
              title={isMinimized ? 'Espandi' : 'Minimizza'}
            >
              {isMinimized ? '▶' : '▼'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {isMinimized ? (
          <div className="text-xs text-gray-400">
            Status: {state.isActive ? '● Attivo' : '○ Inattivo'} | Movimento:{' '}
            {state.motionDetected ? '●' : '○'}
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`font-semibold ${state.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                {state.isActive ? '● Attivo' : '○ Inattivo'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Movimento:</span>
              <span
                className={`font-semibold ${state.motionDetected ? 'text-yellow-400' : 'text-gray-500'}`}
              >
                {state.motionDetected ? '● Rilevato' : '○ Nessuno'}
              </span>
            </div>

            <div className="border-t border-[#6366F1]/20 pt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Osservabili:</span>
                <span className="text-white font-bold">{observablesCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Eventi significativi:</span>
                <span className="text-white font-bold">{meaningfulTotal}</span>
              </div>
              {showDebug && (
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-gray-500">Raw trasformazioni:</span>
                  <span className="text-gray-500">{rawTransformationsCount}</span>
                </div>
              )}
              {meaningfulTotal > 0 && !showDebug && (
                <div className="text-[10px] text-gray-500 pt-1">
                  Nuove: {meaningfulCounts.new_observation} • Correzioni:{' '}
                  {meaningfulCounts.correction_detected} • Annotazioni:{' '}
                  {meaningfulCounts.annotation_detected}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Durata:</span>
                <span className="text-white font-bold">
                  {Math.floor(sessionDuration / 60)}:
                  {(sessionDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="border-t border-[#6366F1]/20 pt-2 space-y-2">
              {onToggleAutoIntervention && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Intervento automatico</span>
                  <button
                    onClick={onToggleAutoIntervention}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      autoInterventionEnabled ? 'bg-[#6366F1]' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        autoInterventionEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {onToggleTTS && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Voce DAI</span>
                  <button
                    onClick={onToggleTTS}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      ttsEnabled ? 'bg-[#6366F1]' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        ttsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-gray-400 hover:text-white transition-colors w-full text-left"
              >
                {showDebug ? '▼ Nascondi' : '▶ Mostra'} Debug
              </button>
            </div>

            {meaningfulEvents.length > 0 && (
              <div className="border-t border-[#6366F1]/20 pt-2">
                <div className="text-gray-400 mb-2">Ultimi eventi significativi:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {meaningfulEvents
                    .slice(-5)
                    .reverse()
                    .map((event: MeaningfulEvent) => (
                      <div
                        key={event.id}
                        className="text-xs bg-[#2a2a3a] p-2 rounded border-l-2 border-[#6366F1]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[#818CF8] font-semibold capitalize">
                            {event.type.replace('_', ' ')}
                          </span>
                          <span className="text-gray-500 text-[10px]">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-400 text-[10px]">{event.description}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {showDebug && rawTransformationsCount > 0 && (
              <div className="border-t border-[#6366F1]/20 pt-2">
                <div className="text-gray-400 mb-2">Raw trasformazioni (debug):</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {state.transformations
                    .slice(-5)
                    .reverse()
                    .map((trans: TransformationEvent) => (
                      <div
                        key={trans.id}
                        className="text-xs bg-[#2a2a3a] p-2 rounded border-l-2 border-gray-600"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-500 font-semibold capitalize">
                            {trans.transformation}
                          </span>
                          <span className="text-gray-600 text-[10px]">
                            {new Date(trans.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-400 text-[10px]">
                          {(trans.metadata as any)?.description ?? ''}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

