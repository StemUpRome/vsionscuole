'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LiveModeToggle,
  RoiSelectorOverlay,
  useMotionDetector,
  captureRoiSnapshot,
} from '@/lib/dai/live-vision'
import TimelineComponent from '@/components/TimelineComponent'
import FractionVisualComponent from '@/components/FractionVisualComponent'
import NumberLineComponent from '@/components/NumberLineComponent'
import GrammarAnalyzerComponent from '@/components/GrammarAnalyzerComponent'
import MapComponent from '@/components/MapComponent'
import MathSolverComponent from '@/components/MathSolverComponent'

interface CameraDevice {
  deviceId: string
  label: string
}

export default function RoomHomeworkPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [activeStep, setActiveStep] = useState<'contesto' | 'eventi' | 'cause' | 'conseguenze'>('eventi')
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [liveVisionEnabled, setLiveVisionEnabled] = useState(false)
  const [roiBounds, setRoiBounds] = useState({ x: 0.2, y: 0.2, width: 0.6, height: 0.6 })
  const [detectedData, setDetectedData] = useState<Array<{ name: string; years: string }>>([])
  const [timelineEvents, setTimelineEvents] = useState<Array<{ year: string; title: string; period: string }>>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTool, setActiveTool] = useState<'none' | 'timeline' | 'fraction' | 'number_line' | 'grammar' | 'map' | 'math'>('none')

  const steps = [
    { id: 'contesto', label: 'Contesto', status: 'done' as const },
    { id: 'eventi', label: 'Eventi Chiave', status: 'current' as const },
    { id: 'cause', label: 'Analisi Cause', status: 'pending' as const },
    { id: 'conseguenze', label: 'Conseguenze', status: 'pending' as const },
  ]

  // Motion detector
  const { onMotionDetected } = useMotionDetector(videoRef, {
    enabled: liveVisionEnabled,
    roiBounds,
  })

  // Elenco telecamere
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = devices
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Telecamera ${d.deviceId.slice(0, 8)}` }))
        setCameras(videoInputs)
        if (videoInputs.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoInputs[0].deviceId)
        }
      } catch (e) {
        console.error('Error listing cameras:', e)
      }
    }
    loadCameras()
  }, [])

  // Avvia telecamera
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsCameraOn(true)
    } catch (e) {
      console.error('Error starting camera:', e)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
    setLiveVisionEnabled(false)
  }

  // Cambia telecamera
  useEffect(() => {
    if (selectedCameraId && isCameraOn) {
      startCamera()
    }
  }, [selectedCameraId])

  // Motion detection callback
  useEffect(() => {
    if (!liveVisionEnabled) return

    onMotionDetected((result) => {
      if (result.hasMotion) {
        console.log('Motion detected:', result.motionIntensity)
      }
    })
  }, [liveVisionEnabled, onMotionDetected])

  // Cattura ROI quando si clicca "Osservo"
  const handleObserve = async () => {
    if (!videoRef.current || !isCameraOn) return

    setIsAnalyzing(true)
    try {
      const snapshot = captureRoiSnapshot({
        video: videoRef.current,
        roiBounds,
      })

      if (snapshot) {
        // TODO: Invia snapshot all'API per analisi
        console.log('ROI captured:', snapshot)

        // Demo: simula dati rilevati
        setTimeout(() => {
          setDetectedData([
            { name: 'La Gioconda', years: '1503-1506' },
            { name: 'Il Cenacolo', years: '1495-1498' },
            { name: 'La Vergine delle Rocce', years: '1483-1486' },
          ])
          setTimelineEvents([
            { year: '1483', title: 'La Vergine delle Rocce', period: '1483-1486' },
            { year: '1495', title: 'Il Cenacolo', period: '1495-1498' },
            { year: '1503', title: 'La Gioconda', period: '1503-1506' },
            { year: '1513', title: 'San Giovanni Battista', period: '1513-1516' },
          ])
          setIsAnalyzing(false)
        }, 1500)
      }
    } catch (e) {
      console.error('Error capturing ROI:', e)
      setIsAnalyzing(false)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Testo per i componenti visual (da obiettivo + dati rilevati/timeline)
  const rawTextForTools = [
    ...timelineEvents.map((e) => `${e.year} ${e.title} ${e.period}`),
    ...detectedData.map((d) => `${d.name} ${d.years}`),
    'Creare una timeline delle opere di Leonardo da Vinci',
  ].join('\n')
  const timelineRawText = timelineEvents.length
    ? timelineEvents.map((e, i) => `${i + 1}. ${e.year} – ${e.title} (${e.period})`).join('\n')
    : rawTextForTools

  const tools = [
    { id: 'timeline' as const, label: 'Timeline', icon: '📅' },
    { id: 'fraction' as const, label: 'Frazioni', icon: '🥧' },
    { id: 'number_line' as const, label: 'Linea numeri', icon: '📏' },
    { id: 'grammar' as const, label: 'Grammatica', icon: '📝' },
    { id: 'map' as const, label: 'Mappa', icon: '🗺️' },
    { id: 'math' as const, label: 'Math', icon: '🔢' },
  ]

  return (
    <div className="flex h-screen bg-[#09090b] text-white overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#18181b] border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <div>
              <h1 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                ZenkAI
              </h1>
              <p className="text-xs text-blue-300/70">Universal Tutor</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                step.status === 'done'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : step.status === 'current'
                    ? 'bg-[#6B48FF] text-white'
                    : 'text-[#A0A0A0] hover:bg-white/5'
              }`}
            >
              {step.status === 'done' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="font-medium text-sm">{step.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="text-xs text-blue-400/70 mb-2 font-semibold">STRUMENTI</div>
          <div className="space-y-1.5">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(activeTool === tool.id ? 'none' : tool.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                  activeTool === tool.id ? 'bg-[#6B48FF] text-white' : 'text-[#A0A0A0] hover:bg-white/5'
                }`}
              >
                <span>{tool.icon}</span>
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-blue-400/70 mb-2">OBIETTIVO</div>
          <div className="text-sm text-white">
            Creare una timeline delle opere di Leonardo da Vinci
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-black">
        {/* Camera Controls */}
        <div className="p-4 border-b border-white/10 flex items-center gap-4">
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="px-4 py-2 bg-[#2C2C2E] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#6B48FF]"
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label}
              </option>
            ))}
          </select>
          {!isCameraOn ? (
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-[#6B48FF] text-white rounded-lg text-sm font-medium hover:bg-[#5A3FE6] transition-colors"
            >
              Avvia telecamera
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="px-4 py-2 bg-[#EF4444] text-white rounded-lg text-sm font-medium hover:bg-[#DC2626] transition-colors"
            >
              Ferma telecamera
            </button>
          )}
          {isCameraOn && (
            <LiveModeToggle enabled={liveVisionEnabled} onToggle={setLiveVisionEnabled} />
          )}
        </div>

        <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
          {/* Video Area with ROI */}
          <div className="relative w-full h-full max-w-4xl max-h-[600px] flex items-center justify-center">
            {isCameraOn ? (
              <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-[#2C2C2E] bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {liveVisionEnabled && (
                  <>
                    <RoiSelectorOverlay
                      bounds={roiBounds}
                      onBoundsChange={(newBounds) => {
                        setRoiBounds(newBounds)
                      }}
                      enabled={true}
                    />
                    <div className="absolute top-4 left-4 bg-blue-400 text-white text-xs px-2 py-1 rounded font-semibold">
                      AREA DI LAVORO
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-full max-w-[300px] max-h-[600px] bg-[#1A1A1A] rounded-[40px] p-2 shadow-2xl border-4 border-[#2C2C2E] flex items-center justify-center">
                <div className="text-center text-[#A0A0A0]">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Avvia la telecamera per iniziare</p>
                </div>
              </div>
            )}

            {/* DATI RILEVATI Card */}
            {detectedData.length > 0 && (
              <div className="absolute -right-[220px] top-10 bg-[#2C2C2E] rounded-xl p-4 shadow-xl border border-white/10 min-w-[180px]">
                <div className="text-xs font-semibold text-blue-400 mb-3">DATI RILEVATI</div>
                <div className="space-y-2">
                  {detectedData.map((item, i) => (
                    <div key={i} className="text-xs text-white">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-[#A0A0A0]">{item.years}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Eventi Card */}
            {timelineEvents.length > 0 && activeTool === 'none' && (
              <div className="absolute -right-[220px] top-[280px] bg-[#2C2C2E] rounded-xl p-4 shadow-xl border border-white/10 min-w-[200px]">
                <div className="text-xs font-semibold text-blue-400 mb-3">Timeline Eventi</div>
                <div className="space-y-3">
                  {timelineEvents.map((event, i) => (
                    <div key={i} className="text-xs">
                      <div className="text-blue-400 font-semibold">{event.year}:</div>
                      <div className="text-white">{event.title}</div>
                      <div className="text-[#A0A0A0]">{event.period}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Componenti Visual (Timeline, Frazioni, Linea numeri, Grammatica, Mappa, Math) */}
            {activeTool !== 'none' && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute inset-8 pointer-events-auto">
                  {activeTool === 'timeline' && (
                    <TimelineComponent rawText={timelineRawText} />
                  )}
                  {activeTool === 'fraction' && (
                    <FractionVisualComponent rawText={rawTextForTools} sidebarCollapsed={false} />
                  )}
                  {activeTool === 'number_line' && (
                    <NumberLineComponent rawText={rawTextForTools} sidebarCollapsed={false} />
                  )}
                  {activeTool === 'grammar' && (
                    <GrammarAnalyzerComponent rawText={rawTextForTools} sidebarCollapsed={false} />
                  )}
                  {activeTool === 'map' && (
                    <MapComponent rawText={rawTextForTools} sidebarCollapsed={false} />
                  )}
                  {activeTool === 'math' && (
                    <MathSolverComponent rawText={rawTextForTools} />
                  )}
                </div>
                <button
                  onClick={() => setActiveTool('none')}
                  className="absolute top-4 right-4 z-20 pointer-events-auto px-3 py-1.5 bg-[#2C2C2E] hover:bg-[#333335] text-white text-sm rounded-lg border border-white/10"
                >
                  Chiudi strumento
                </button>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <button className="w-12 h-12 bg-[#2C2C2E] rounded-full flex items-center justify-center hover:bg-[#333335] transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button className="w-12 h-12 bg-[#2C2C2E] rounded-full flex items-center justify-center hover:bg-[#333335] transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={handleObserve}
              disabled={!isCameraOn || isAnalyzing}
              className="px-6 py-3 bg-[#6B48FF] text-white rounded-xl font-medium hover:bg-[#5A3FE6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analizzando...' : 'Osservo'}
            </button>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Chat D.A.I */}
      <aside className="w-80 bg-[#18181b] border-l border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">D.A.I</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-[#2C2C2E] rounded-xl p-3 text-sm text-white">
            mi fai la time line sulle opere del pittore
          </div>
          <div className="bg-[#6B48FF]/20 border border-[#6B48FF]/30 rounded-xl p-3 text-sm text-white">
            Parliamo delle opere di Leonardo da Vinci! Quali opere conosci? Posso aiutarti a collocarle nel tempo in una timeline.
          </div>
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-blue-400/70 mb-2">DOMANDA GUIDA</div>
          <div className="text-sm text-white mb-3">
            Quali sono le opere principali di Leonardo da Vinci che vuoi includere nella timeline?
          </div>
          <input
            type="text"
            placeholder="Rispondi..."
            className="w-full px-4 py-2 bg-[#2C2C2E] border border-white/10 rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-[#6B48FF]"
          />
        </div>
      </aside>
    </div>
  )
}
