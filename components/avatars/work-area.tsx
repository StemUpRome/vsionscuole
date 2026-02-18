'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LiveModeToggle,
  RoiSelectorOverlay,
  useMotionDetector,
  useStabilizationTrigger,
} from '@/lib/dai/live-vision'
import TimelineComponent from '@/components/TimelineComponent'
import FractionVisualComponent from '@/components/FractionVisualComponent'
import NumberLineComponent from '@/components/NumberLineComponent'
import GrammarAnalyzerComponent from '@/components/GrammarAnalyzerComponent'
import MapComponent from '@/components/MapComponent'
import MathSolverComponent from '@/components/MathSolverComponent'

// ==========================================
// TIPI E INTERFACCE
// ==========================================

type Step = {
  id: number
  label: string
  status: 'done' | 'current' | 'pending'
}

type ToolType =
  | 'none'
  | 'balance_scale'
  | 'language_card'
  | 'molecule_3d'
  | 'history_timeline'
  | 'geometry_protractor'
  | 'concept_map'
  | 'number_line'
  | 'grammar_analyzer'
  | 'fraction_visual'
  | 'flashcard_viewer'
  | 'math_solver'

type ArOverlay = {
  show_workspace: boolean
  data_panel: string[]
  tool_active: ToolType
  tool_content: any
}

type SidebarData = {
  steps: Step[]
  card: {
    objective: string
    question: string
    hints: string[]
  }
}

type UiState = {
  spoken_text: string
  ar_overlay: ArOverlay
  sidebar: SidebarData
}

type VideoDevice = { 
  deviceId: string
  label: string
  type: 'front' | 'back' | 'external' | 'unknown'
}
type ChatMessage = { sender: 'user' | 'ai'; text: string }

// Estensione per API Web Speech
declare global {
  interface Window {
    webkitSpeechRecognition: any
    webkitAudioContext: any
  }
}

// ==========================================
// STATO INIZIALE
// ==========================================
const INITIAL_STATE: UiState = {
  spoken_text: "Benvenuto. Inquadra l'esercizio per iniziare.",
  ar_overlay: {
    show_workspace: true,
    data_panel: [],
    tool_active: 'none',
    tool_content: '',
  },
  sidebar: {
    steps: [
      { id: 1, label: 'Attesa Immagine', status: 'current' },
      { id: 2, label: 'Analisi', status: 'pending' },
      { id: 3, label: 'Elaborazione', status: 'pending' },
    ],
    card: {
      objective: 'Pronto',
      question: 'Premi la fotocamera o usa il microfono.',
      hints: [],
    },
  },
}

// ==========================================
// COMPONENTE PRINCIPALE
// ==========================================

interface WorkAreaProps {
  avatarId: string
  avatarName: string
}

export default function WorkArea({ avatarId, avatarName }: WorkAreaProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)

  // Audio Engine Refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const recognitionRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)

  // ==========================================
  // STATI APPLICAZIONE
  // ==========================================
  const [ui, setUi] = useState<UiState>(INITIAL_STATE)
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [inputText, setInputText] = useState('')
  const [activeHint, setActiveHint] = useState<number>(-1)

  // Hardware
  const [devices, setDevices] = useState<VideoDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCameraPaused, setIsCameraPaused] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // Audio Visualizer
  const [isListening, setIsListening] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 15, 10])

  // ROI State
  const [roiSnapEnabled, setRoiSnapEnabled] = useState(false)
  const [roiBounds, setRoiBounds] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  const [roiIsDragging, setRoiIsDragging] = useState(false)
  const [roiIsResizing, setRoiIsResizing] = useState<string | null>(null)
  const roiDragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, startW: 0, startH: 0 })
  const roiEmaRef = useRef({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  const roiLockRef = useRef<boolean>(false)
  const edgeCacheRef = useRef<{ horizontal: number[]; vertical: number[]; timestamp: number } | null>(null)
  const edgeDetectionThrottleRef = useRef<number | null>(null)

  // Holographic Tools State
  const [activeTool, setActiveTool] = useState<'none' | 'hint' | 'area' | 'draw'>('none')
  const [drawToolType, setDrawToolType] = useState<'pen' | 'highlight' | 'eraser'>('pen')
  const [hintPointer, setHintPointer] = useState<{ x: number; y: number; hint?: string } | null>(null)
  const [areaSelection, setAreaSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isSelectingArea, setIsSelectingArea] = useState(false)
  const areaSelectionStartRef = useRef<{ x: number; y: number } | null>(null)
  const [drawings, setDrawings] = useState<any[]>([])
  const currentDrawPathRef = useRef<any>(null)
  const isDrawingRef = useRef(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: typeof window !== 'undefined' ? window.innerWidth - 200 : 0, y: 100 })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [supportToolsExpanded, setSupportToolsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [showDeviceSelector, setShowDeviceSelector] = useState(false)

  // Live Vision State
  const [liveVisionEnabled, setLiveVisionEnabled] = useState(false)
  const [motionDetected, setMotionDetected] = useState(false)
  const [motionIntensity, setMotionIntensity] = useState(0)

  // Motion Detection Hook
  const { onMotionDetected: setMotionCallback } = useMotionDetector(videoRef, {
    enabled: liveVisionEnabled && !isCameraPaused,
    threshold: 0.02,
    interval: 500,
    roiBounds: {
      x: roiBounds.x,
      y: roiBounds.y,
      width: roiBounds.w,
      height: roiBounds.h,
    },
  })

  // Setup motion detection callback
  useEffect(() => {
    setMotionCallback((result) => {
      setMotionDetected(result.hasMotion)
      setMotionIntensity(result.motionIntensity)
    })
  }, [setMotionCallback])

  // Chiudi dropdown camera selector quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeviceSelector && !(event.target as Element).closest('.camera-selector-container')) {
        setShowDeviceSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDeviceSelector])

  // Stabilization Trigger Hook
  useStabilizationTrigger(
    {
      x: roiBounds.x,
      y: roiBounds.y,
      width: roiBounds.w,
      height: roiBounds.h,
    },
    {
      enabled: liveVisionEnabled,
      config: {
        threshold: 0.02,
        smoothingFactor: 0.7,
        minChangeForUpdate: 0.01,
      },
      onStabilize: (smoothed) => {
        setRoiBounds({
          x: smoothed.x,
          y: smoothed.y,
          w: smoothed.width,
          h: smoothed.height,
        })
      },
    }
  )

  // ==========================================
  // LIFECYCLE & SETUP
  // ==========================================

  // Scroll automatico chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  // Cleanup totale quando esci dalla pagina
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      if (audioContextRef.current) audioContextRef.current.close()
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (recognitionRef.current) recognitionRef.current.stop()
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  // Detect mobile e gestisci resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setLeftSidebarOpen(false)
        setRightSidebarOpen(false)
        setSidebarCollapsed(true)
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Funzione helper per identificare il tipo di camera
  const identifyCameraType = (label: string, deviceId: string): 'front' | 'back' | 'external' | 'unknown' => {
    const labelLower = label.toLowerCase()
    
    // Front camera indicators
    if (
      labelLower.includes('front') ||
      labelLower.includes('facing') ||
      labelLower.includes('user') ||
      labelLower.includes('selfie') ||
      labelLower.includes('facetime') ||
      (labelLower.includes('camera') && !labelLower.includes('back') && !labelLower.includes('rear'))
    ) {
      return 'front'
    }
    
    // Back/rear camera indicators
    if (
      labelLower.includes('back') ||
      labelLower.includes('rear') ||
      labelLower.includes('environment') ||
      labelLower.includes('world') ||
      labelLower.includes('main camera')
    ) {
      return 'back'
    }
    
    // External webcam indicators (USB, HD, etc.)
    if (
      labelLower.includes('usb') ||
      labelLower.includes('hd') ||
      labelLower.includes('webcam') ||
      labelLower.includes('camera') && (labelLower.includes('logitech') || labelLower.includes('microsoft') || labelLower.includes('sony'))
    ) {
      return 'external'
    }
    
    return 'unknown'
  }

  // Inizializzazione Camera
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Prima richiediamo i permessi per ottenere i label completi
        try {
          await navigator.mediaDevices.getUserMedia({ video: true })
        } catch (e) {
          console.warn('Permessi camera non concessi, i label potrebbero essere generici')
        }
        
        const allDevs = await navigator.mediaDevices.enumerateDevices()
        const vDevs = allDevs
          .filter((d) => d.kind === 'videoinput')
          .map((d) => {
            const label = d.label || `Camera ${allDevs.filter(dev => dev.kind === 'videoinput').indexOf(d) + 1}`
            const type = identifyCameraType(label, d.deviceId)
            return { 
              deviceId: d.deviceId, 
              label,
              type
            }
          })

        setDevices(vDevs)
        if (vDevs.length > 0 && !selectedDeviceId) {
          // Preferisci la camera frontale se disponibile, altrimenti la prima
          const frontCam = vDevs.find(d => d.type === 'front')
          setSelectedDeviceId(frontCam?.deviceId || vDevs[0].deviceId)
        }
      } catch (e) {
        console.error('Err Cam:', e)
      }
    }
    getDevices()

    // Ascolta i cambiamenti dei dispositivi (es. connessione/disconnessione)
    const handleDeviceChange = () => {
      getDevices()
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [])

  // Avvio Stream Video
  useEffect(() => {
    if (!selectedDeviceId || isCameraPaused) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }
      return
    }
    const startStream = async () => {
      try {
        // Prova prima con qualità alta
        let mediaStream: MediaStream | null = null
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: selectedDeviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            },
          })
        } catch (highQualityError) {
          // Se fallisce, prova con configurazione più semplice
          console.warn('High quality stream failed, trying basic config:', highQualityError)
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: selectedDeviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            })
          } catch (mediumQualityError) {
            // Ultimo fallback: configurazione minima
            console.warn('Medium quality stream failed, trying minimum config:', mediumQualityError)
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: selectedDeviceId },
              },
            })
          }
        }
        
        if (mediaStream && videoRef.current) {
          videoRef.current.srcObject = mediaStream
          setStream(mediaStream)
        }
      } catch (e) {
        console.error('Err Stream - All attempts failed:', e)
        // Mostra errore all'utente se disponibile
        alert('Impossibile accedere alla camera. Verifica i permessi e che la camera sia connessa.')
      }
    }
    startStream()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [selectedDeviceId, isCameraPaused])

  // ==========================================
  // MOTORE AUDIO (Visualizer & TTS)
  // ==========================================

  const animateVisualizer = () => {
    if (isAiSpeaking) {
      setAudioLevels([Math.random() * 40 + 10, Math.random() * 50 + 20, Math.random() * 40 + 10])
    } else if (analyserRef.current && isListening) {
      const d = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(d)
      setAudioLevels([d[0] / 2, d[10] / 2, d[20] / 2])
    } else {
      setAudioLevels([10, 15, 10])
    }
    animationFrameRef.current = requestAnimationFrame(animateVisualizer)
  }

  const speak = (text: string) => {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'it-IT'
    u.onstart = () => {
      setIsAiSpeaking(true)
      animateVisualizer()
    }
    u.onend = () => {
      setIsAiSpeaking(false)
      if (!isListening) setAudioLevels([10, 15, 10])
    }
    window.speechSynthesis.speak(u)
  }

  const startMicrophone = async () => {
    window.speechSynthesis.cancel()
    setIsAiSpeaking(false)
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const ana = ctx.createAnalyser()
      ana.fftSize = 64
      const src = ctx.createMediaStreamSource(audioStream)
      src.connect(ana)

      audioContextRef.current = ctx
      analyserRef.current = ana
      setIsListening(true)
      animateVisualizer()

      if ('webkitSpeechRecognition' in window) {
        const rec = new window.webkitSpeechRecognition()
        rec.lang = 'it-IT'
        rec.continuous = false
        rec.interimResults = false
        rec.onresult = (e: any) => {
          stopMicrophone()
          handleAnalyze(e.results[0][0].transcript)
        }
        rec.onerror = () => stopMicrophone()
        rec.start()
        recognitionRef.current = rec
      }
    } catch (e) {
      console.error(e)
      alert('Errore Microfono')
    }
  }

  const stopMicrophone = () => {
    audioContextRef.current?.close()
    recognitionRef.current?.stop()
    setIsListening(false)
    setAudioLevels([10, 15, 10])
  }

  // ==========================================
  // ROI: Drag & Resize Handlers
  // ==========================================

  const roiStartDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    setRoiIsDragging(true)
    roiDragStartRef.current = {
      x,
      y,
      startX: roiBounds.x,
      startY: roiBounds.y,
      startW: roiBounds.w,
      startH: roiBounds.h,
    }
  }

  const roiStartResize = (corner: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    setRoiIsResizing(corner)
    roiDragStartRef.current = {
      x,
      y,
      startX: roiBounds.x,
      startY: roiBounds.y,
      startW: roiBounds.w,
      startH: roiBounds.h,
    }
  }

  // ROI: Mouse Move Handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!roiIsDragging && !roiIsResizing) return
      if (!containerRef.current) return

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const mouseX = (e.clientX - rect.left) / rect.width
      const mouseY = (e.clientY - rect.top) / rect.height

      const deltaX = mouseX - roiDragStartRef.current.x
      const deltaY = mouseY - roiDragStartRef.current.y

      let newBounds = { ...roiBounds }

      if (roiIsDragging) {
        newBounds.x = Math.max(0, Math.min(1 - roiBounds.w, roiDragStartRef.current.startX + deltaX))
        newBounds.y = Math.max(0, Math.min(1 - roiBounds.h, roiDragStartRef.current.startY + deltaY))
      } else if (roiIsResizing) {
        const { startX, startY, startW, startH } = roiDragStartRef.current

        switch (roiIsResizing) {
          case 'nw':
            newBounds.x = Math.max(0, Math.min(startX + deltaX, startX + startW - 0.1))
            newBounds.y = Math.max(0, Math.min(startY + deltaY, startY + startH - 0.1))
            newBounds.w = Math.max(0.1, startW - deltaX)
            newBounds.h = Math.max(0.1, startH - deltaY)
            break
          case 'ne':
            newBounds.y = Math.max(0, Math.min(startY + deltaY, startY + startH - 0.1))
            newBounds.w = Math.max(0.1, Math.min(1 - startX, startW + deltaX))
            newBounds.h = Math.max(0.1, startH - deltaY)
            break
          case 'sw':
            newBounds.x = Math.max(0, Math.min(startX + deltaX, startX + startW - 0.1))
            newBounds.w = Math.max(0.1, startW - deltaX)
            newBounds.h = Math.max(0.1, Math.min(1 - startY, startH + deltaY))
            break
          case 'se':
            newBounds.w = Math.max(0.1, Math.min(1 - startX, startW + deltaX))
            newBounds.h = Math.max(0.1, Math.min(1 - startY, startH + deltaY))
            break
        }
      }

      setRoiBounds(newBounds)
    }

    const handleMouseUp = () => {
      setRoiIsDragging(false)
      setRoiIsResizing(null)
    }

    if (roiIsDragging || roiIsResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [roiIsDragging, roiIsResizing, roiBounds])

  // ==========================================
  // MOTORE ANALISI (Chiamata al Server)
  // ==========================================

  const handleAnalyze = async (textInput: string) => {
    if (isAnalyzing) return
    setIsAnalyzing(true)

    if (textInput) setHistory((prev) => [...prev, { sender: 'user', text: textInput }])
    setInputText('')

    if (isCameraPaused) {
      setHistory((prev) => [
        ...prev,
        { sender: 'ai', text: 'La camera è in pausa. Premi il pulsante play per riattivarla.' },
      ])
      setIsAnalyzing(false)
      return
    }

    const vid = videoRef.current
    if (!vid || vid.readyState < 2) {
      setHistory((prev) => [
        ...prev,
        { sender: 'ai', text: 'La camera non è disponibile. Verifica le impostazioni.' },
      ])
      setIsAnalyzing(false)
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = vid.videoWidth || 1920
    canvas.height = vid.videoHeight || 1080

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setIsAnalyzing(false)
      return
    }

    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
    const imgBase64 = canvas.toDataURL('image/jpeg', 0.8)

    try {
      // TODO: Sostituire con endpoint reale
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imgBase64,
          userQuestion: textInput || '',
          history: history,
        }),
      })

      if (!res.ok) throw new Error('Errore Server')

      const data: UiState = await res.json()

      setUi(data)
      setHistory((prev) => [...prev, { sender: 'ai', text: data.spoken_text }])
      speak(data.spoken_text)
      setActiveHint(-1)
    } catch (e) {
      console.error('Errore:', e)
      setHistory((prev) => [...prev, { sender: 'ai', text: 'Errore di connessione. Riprova.' }])
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Testo per i componenti visual (obiettivo + dati rilevati)
  const rawTextForTools = [
    ui.sidebar?.card?.objective ?? '',
    ...(ui.ar_overlay?.data_panel ?? []),
  ].filter(Boolean).join('\n') || 'Pronto. Inquadra l\'esercizio o usa il microfono.'
  const timelineRawText = (ui.ar_overlay?.data_panel?.length
    ? ui.ar_overlay.data_panel.map((line, i) => `${i + 1}. ${line}`).join('\n')
    : rawTextForTools)

  const visualToolActive = ui.ar_overlay?.tool_active
  const hasVisualOverlay = [
    'fraction_visual',
    'number_line',
    'grammar_analyzer',
    'history_timeline',
    'concept_map',
    'math_solver',
  ].includes(visualToolActive ?? 'none')

  // ==========================================
  // RENDER UI (Layout 3 Colonne Completo)
  // ==========================================
  return (
    <div className={`flex ${isMobile ? 'flex-col' : ''} h-screen bg-[#09090b] text-white font-sans overflow-hidden relative`}>
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex md:hidden items-center justify-between p-3 bg-[#18181b] border-b border-white/10 z-30">
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-lg"
          >
            ☰
          </button>
          <span className="text-sm font-bold">ZenkAI Room</span>
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-lg"
          >
            💬
          </button>
        </div>
      )}

      {/* Mobile Overlay */}
      {(leftSidebarOpen || rightSidebarOpen) && isMobile && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => {
            setLeftSidebarOpen(false)
            setRightSidebarOpen(false)
          }}
        />
      )}

      {/* === COL 1: SIDEBAR (Percorso Adattivo) - JARVIS Style === */}
      <div
        className={`
        jarvis-sidebar flex flex-col z-20 relative transition-all duration-300
        ${isMobile
          ? `fixed left-0 top-0 h-full transform transition-transform duration-300 ${
              leftSidebarOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full w-[240px]'
            }`
          : `${sidebarCollapsed ? 'w-[60px]' : 'w-[220px]'}`
        }
      `}
        style={{ 
          background: 'linear-gradient(180deg, rgba(9,9,11,0.90) 0%, rgba(18,18,20,0.90) 100%)',
          borderRight: '1px solid rgba(96, 165, 250, 0.30)',
          boxShadow: '5px 0 15px rgba(96, 165, 250, 0.20)'
        }}
      >
        <div className={`jarvis-sidebar-header ${isMobile ? 'p-4' : 'p-6'} flex items-center justify-between`}>
          {!sidebarCollapsed || isMobile ? (
            <>
              <button
                onClick={() => router.push('/avatars')}
                className="relative hover:opacity-80 transition-opacity"
                title="Torna alla home"
              >
                <h1
                  className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent jarvis-icon-glow cursor-pointer`}
                >
                  ZenkAI
                </h1>
                <p className="text-xs text-blue-300/70 mt-1 font-light tracking-wide">Universal Tutor</p>
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
              </button>
            </>
          ) : (
            <div className="text-2xl bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent jarvis-icon-glow font-bold">
              VW
            </div>
          )}
          {!isMobile && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="jarvis-button w-8 h-8 flex items-center justify-center rounded-lg jarvis-icon-glow"
              title={sidebarCollapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => setLeftSidebarOpen(false)}
              className="jarvis-button w-8 h-8 flex items-center justify-center rounded-lg jarvis-icon-glow"
            >
              ✕
            </button>
          )}
        </div>

        {/* LISTA STEP (Dinamica dal Server) - JARVIS Style */}
        {!sidebarCollapsed && (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-2">
                {ui.sidebar?.steps?.map((step) => (
                  <div
                    key={step.id}
                    className={`jarvis-step-item flex items-center gap-2 p-2.5 rounded-xl ${
                      step.status === 'current' ? 'current' : step.status === 'done' ? 'done' : ''
                    }`}
                  >
                    <div
                      className={`jarvis-step-circle w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.status === 'done'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white done'
                          : step.status === 'current'
                            ? 'border-2 border-blue-400 text-blue-400 bg-gradient-to-br from-blue-400/20 to-blue-600/20 current'
                            : 'border border-gray-600/50 text-gray-500 bg-transparent'
                      }`}
                    >
                      {step.status === 'done' ? '✓' : step.id}
                    </div>
                    <span
                      className={`text-sm font-medium ${step.status === 'current' ? 'text-white' : step.status === 'done' ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* STRUMENTI DI SUPPORTO (Compatto) */}
              <div className="border-t border-white/5 mt-2">
                <button
                  onClick={() => setSupportToolsExpanded(!supportToolsExpanded)}
                  className="w-full p-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛠️</span>
                    <span className="text-xs font-light text-blue-400/80">Strumenti</span>
                  </div>
                  <span className={`text-xs text-gray-500 transition-transform ${supportToolsExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {supportToolsExpanded && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {[
                      { type: 'fraction_visual' as ToolType, icon: '🥧', label: 'Frazioni' },
                      { type: 'number_line' as ToolType, icon: '📏', label: 'Linea Numeri' },
                      { type: 'history_timeline' as ToolType, icon: '📅', label: 'Timeline' },
                      { type: 'grammar_analyzer' as ToolType, icon: '📝', label: 'Grammatica' },
                      { type: 'concept_map' as ToolType, icon: '🗺️', label: 'Mappa' },
                      { type: 'math_solver' as ToolType, icon: '🔢', label: 'Math' },
                      { type: 'balance_scale' as ToolType, icon: '⚖️', label: 'Bilancia' },
                      { type: 'geometry_protractor' as ToolType, icon: '📐', label: 'Geometria' },
                    ].map((tool) => (
                      <button
                        key={tool.type}
                        onClick={() => {
                          setUi((prev) => ({
                            ...prev,
                            ar_overlay: {
                              ...prev.ar_overlay,
                              tool_active: prev.ar_overlay.tool_active === tool.type ? 'none' : tool.type,
                            },
                          }))
                        }}
                        className={`jarvis-button w-full flex items-center gap-2 p-2 rounded-lg text-xs font-light transition-all ${
                          ui.ar_overlay?.tool_active === tool.type ? 'border-blue-400/60' : 'border-blue-400/20'
                        }`}
                      >
                        <span className="text-sm">{tool.icon}</span>
                        <span className="flex-1 text-left text-white text-xs">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* OBIETTIVO - JARVIS Style (Compatto) */}
            <div className="jarvis-objective-box p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="text-[9px] font-light uppercase tracking-[0.15em] text-blue-400">Obiettivo</div>
              </div>
              <div className="text-xs font-light text-white leading-snug jarvis-icon-glow">
                {ui.sidebar?.card?.objective}
              </div>
            </div>
          </>
        )}
      </div>

      {/* === COL 2: CENTER (Video & AR) === */}
      <div
        ref={containerRef}
        className={`flex-1 relative bg-black flex items-center justify-center overflow-hidden ${isMobile ? 'w-full' : ''}`}
      >
        {!isCameraPaused ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              filter: 'none',
              transform: 'scale(1)',
              imageRendering: 'auto'
            }}
          />
        ) : (
          <div className="text-gray-500 flex flex-col items-center gap-4">
            <span className="text-6xl">⏸️</span>Camera Pausa
          </div>
        )}

        {/* Live Vision Toggle */}
        <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-6 right-6'} z-50`}>
          <LiveModeToggle enabled={liveVisionEnabled} onToggle={setLiveVisionEnabled} />
        </div>

        {/* Motion Indicator */}
        {liveVisionEnabled && motionDetected && (
          <div
            className={`absolute ${isMobile ? 'top-2 right-28' : 'top-6 right-32'} z-50 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg`}
          >
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-xs text-yellow-400 font-semibold">
              Movimento ({Math.round(motionIntensity * 100)}%)
            </span>
          </div>
        )}

        {/* ROI Selector Overlay */}
        {liveVisionEnabled && (
          <RoiSelectorOverlay
            bounds={{
              x: roiBounds.x,
              y: roiBounds.y,
              width: roiBounds.w,
              height: roiBounds.h,
            }}
            onBoundsChange={(newBounds) => {
              setRoiBounds({
                x: newBounds.x,
                y: newBounds.y,
                w: newBounds.width,
                h: newBounds.height,
              })
            }}
            enabled={liveVisionEnabled}
          />
        )}

        {/* TOP TOOLS - JARVIS Style */}
        <div className={`absolute ${isMobile ? 'top-2 left-2' : 'top-6 left-6'} flex gap-3 z-50 flex-wrap`}>
          <button
            onClick={() => router.push('/avatars')}
            className="jarvis-button px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
              Esci
            </span>
          </button>
          <button
            onClick={() => setIsCameraPaused(!isCameraPaused)}
            className="jarvis-button w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-lg sm:text-xl jarvis-icon-glow"
          >
            {isCameraPaused ? '▶' : '⏸'}
          </button>
          
          {/* Camera Selector Dropdown */}
          <div className="relative camera-selector-container">
            <button
              onClick={() => setShowDeviceSelector(!showDeviceSelector)}
              className="jarvis-button w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-lg sm:text-xl jarvis-icon-glow"
              title="Cambia camera"
            >
              📹
            </button>
            
            {showDeviceSelector && (
              <>
                {/* Overlay per chiudere cliccando fuori */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDeviceSelector(false)}
                />
                {/* Dropdown - posizionato in modo intelligente */}
                <div className="fixed sm:absolute sm:top-full sm:right-0 sm:mt-2 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0 bg-[#1E1F20] rounded-xl border border-gray-700 shadow-2xl p-4 min-w-[280px] max-w-[90vw] sm:max-w-[320px] z-50 max-h-[70vh] sm:max-h-[400px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700">
                    <div className="text-sm font-semibold text-white">Seleziona Camera</div>
                    <button
                      onClick={() => setShowDeviceSelector(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {devices.length === 0 ? (
                    <p className="text-xs text-gray-400 p-2 text-center">Nessuna camera disponibile</p>
                  ) : (
                    <div className="space-y-1.5">
                      {devices.map((d) => {
                        const getTypeIcon = (type: string) => {
                          switch (type) {
                            case 'front': return '📱'
                            case 'back': return '📷'
                            case 'external': return '🖥️'
                            default: return '📹'
                          }
                        }
                        
                        const getTypeLabel = (type: string) => {
                          switch (type) {
                            case 'front': return 'Frontale'
                            case 'back': return 'Posteriore'
                            case 'external': return 'Esterna'
                            default: return 'Camera'
                          }
                        }

                        return (
                          <button
                            key={d.deviceId}
                            onClick={() => {
                              setSelectedDeviceId(d.deviceId)
                              setShowDeviceSelector(false)
                            }}
                            className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                              selectedDeviceId === d.deviceId
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'bg-white/5 hover:bg-white/10 text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{getTypeIcon(d.type)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{d.label}</div>
                                <div className={`text-xs mt-0.5 ${selectedDeviceId === d.deviceId ? 'text-blue-100' : 'text-gray-400'}`}>
                                  {getTypeLabel(d.type)}
                                </div>
                              </div>
                              {selectedDeviceId === d.deviceId && (
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="jarvis-button w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-lg sm:text-xl jarvis-icon-glow"
          >
            ⚙️
          </button>
        </div>

        {/* AR: WORKSPACE (Box Blu Interattivo - JARVIS Style) */}
        {ui.ar_overlay?.show_workspace && (
          <div
            className="absolute z-10"
            style={{
              left: `${roiBounds.x * 100}%`,
              top: `${roiBounds.y * 100}%`,
              width: `${roiBounds.w * 100}%`,
              height: `${roiBounds.h * 100}%`,
            }}
          >
            {/* Header Workspace - JARVIS Style */}
            <div className="workspace-header absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-400/20 via-blue-400/25 to-blue-600/20 backdrop-blur-xl border border-blue-400/50 px-6 py-2 rounded-full text-[10px] font-light uppercase tracking-[0.2em] text-blue-400/80 whitespace-nowrap shadow-[0_0_30px_rgba(77,208,225,0.4)] jarvis-icon-glow pointer-events-none">
              <span className="relative">
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                AREA DI LAVORO
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
              </span>
            </div>

            <div
              ref={workspaceRef}
              className="jarvis-workspace absolute inset-0 rounded-3xl transition-all duration-200"
              style={{
                cursor: roiIsDragging ? 'grabbing' : 'grab',
                pointerEvents: 'auto',
              }}
              onMouseDown={(e) => {
                if (activeTool === 'none' && !roiIsDragging) {
                  roiStartDrag(e)
                }
              }}
            >
              {/* Resize Handles */}
              <div
                className="resize-handle absolute -top-2 -left-2 w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white/90 rounded cursor-nwse-resize hover:scale-125 transition-all z-20 shadow-[0_0_15px_rgba(100,181,246,0.8)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)', borderRadius: '0.375rem' }}
                onMouseDown={roiStartResize('nw')}
              />
              <div
                className="resize-handle absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-bl from-blue-400 to-blue-600 border-2 border-white/90 rounded cursor-nesw-resize hover:scale-125 transition-all z-20 shadow-[0_0_15px_rgba(100,181,246,0.8)]"
                style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)', borderRadius: '0.375rem' }}
                onMouseDown={roiStartResize('ne')}
              />
              <div
                className="resize-handle absolute -bottom-2 -left-2 w-5 h-5 bg-gradient-to-tr from-blue-400 to-blue-600 border-2 border-white/90 rounded cursor-nesw-resize hover:scale-125 transition-all z-20 shadow-[0_0_15px_rgba(100,181,246,0.8)]"
                style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)', borderRadius: '0.375rem' }}
                onMouseDown={roiStartResize('sw')}
              />
              <div
                className="resize-handle absolute -bottom-2 -right-2 w-5 h-5 bg-gradient-to-tl from-blue-400 to-blue-600 border-2 border-white/90 rounded cursor-nwse-resize hover:scale-125 transition-all z-20 shadow-[0_0_15px_rgba(100,181,246,0.8)]"
                style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', borderRadius: '0.375rem' }}
                onMouseDown={roiStartResize('se')}
              />
            </div>
          </div>
        )}

        {/* Overlay componenti visual (Timeline, Frazioni, Linea numeri, Grammatica, Mappa, Math) */}
        {hasVisualOverlay && (
          <div className="absolute inset-0 z-30 pointer-events-auto">
            <div className="absolute inset-8 bg-[#09090b]/95 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 relative">
                {visualToolActive === 'history_timeline' && (
                  <TimelineComponent rawText={timelineRawText} />
                )}
                {visualToolActive === 'fraction_visual' && (
                  <FractionVisualComponent rawText={rawTextForTools} sidebarCollapsed={false} />
                )}
                {visualToolActive === 'number_line' && (
                  <NumberLineComponent rawText={rawTextForTools} sidebarCollapsed={false} />
                )}
                {visualToolActive === 'grammar_analyzer' && (
                  <GrammarAnalyzerComponent rawText={rawTextForTools} sidebarCollapsed={false} />
                )}
                {visualToolActive === 'concept_map' && (
                  <MapComponent rawText={rawTextForTools} sidebarCollapsed={false} />
                )}
                {visualToolActive === 'math_solver' && (
                  <MathSolverComponent rawText={rawTextForTools} />
                )}
              </div>
              <button
                onClick={() =>
                  setUi((prev) => ({
                    ...prev,
                    ar_overlay: { ...prev.ar_overlay, tool_active: 'none', tool_content: '' },
                  }))
                }
                className="absolute top-2 right-2 z-20 pointer-events-auto px-3 py-1.5 bg-[#2C2C2E] hover:bg-[#333335] text-white text-sm rounded-lg border border-white/10"
              >
                Chiudi strumento
              </button>
            </div>
          </div>
        )}

        {/* DOCK COMANDI - JARVIS Style */}
        <div className={`absolute ${isMobile ? 'bottom-4 left-2 right-2' : 'bottom-8'} flex gap-3 sm:gap-4 z-50 ${isMobile ? 'justify-center' : ''}`}>
          {/* Mic Button con Visualizer - JARVIS Style */}
          <button
            onClick={() => (isListening ? stopMicrophone() : startMicrophone())}
            className={`jarvis-button ${isMobile ? 'h-14 w-14' : 'h-20 w-20'} rounded-2xl flex items-center justify-center relative overflow-hidden ${
              isListening
                ? 'bg-gradient-to-br from-red-500/90 to-red-700/90 border-red-400/60 shadow-[0_0_40px_rgba(239,68,68,0.6)]'
                : isAiSpeaking
                  ? 'bg-gradient-to-br from-green-500/90 to-green-700/90 border-green-400/60 shadow-[0_0_40px_rgba(34,197,94,0.6)]'
                  : 'border-blue-400/30'
            }`}
          >
            {isListening || isAiSpeaking ? (
              <div className="flex gap-1.5 h-6 sm:h-8 items-end">
                <div
                  className="w-1.5 sm:w-2 bg-white rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  style={{ height: Math.min(isMobile ? 20 : 32, audioLevels[0] || 8) }}
                ></div>
                <div
                  className="w-1.5 sm:w-2 bg-white rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  style={{ height: Math.min(isMobile ? 24 : 40, audioLevels[1] || 12) }}
                ></div>
                <div
                  className="w-1.5 sm:w-2 bg-white rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  style={{ height: Math.min(isMobile ? 20 : 32, audioLevels[2] || 8) }}
                ></div>
              </div>
            ) : (
              <span className={`${isMobile ? 'text-xl' : 'text-3xl'} jarvis-icon-glow`}>🎙️</span>
            )}
          </button>

          {/* Pulsante Osservo - JARVIS Style */}
          <button
            onClick={() => handleAnalyze('cosa sto osservando?')}
            className={`jarvis-primary ${isMobile ? 'h-14 flex-1 px-4' : 'h-20 px-8'} rounded-2xl text-white font-bold flex items-center justify-center gap-3 text-sm sm:text-base relative overflow-hidden group`}
          >
            <span className="relative z-10 flex items-center gap-3">
              <svg className={`${isMobile ? 'w-5 h-5' : 'w-7 h-7'} jarvis-icon-glow`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className={isMobile ? 'text-xs font-semibold tracking-wide' : 'text-base font-bold tracking-wide'}>
                OSSERVA
              </span>
            </span>
            {/* Effetto shine al hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </button>
        </div>

        {/* LOADING - JARVIS Style */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-40">
            <div className="jarvis-button px-10 py-8 rounded-3xl border border-blue-400/50 flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(77,208,225,0.5)] relative overflow-hidden">
              <div className="jarvis-icon-glow">
                <svg className="w-16 h-16 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <span className="font-light text-blue-400 uppercase tracking-[0.3em] text-sm jarvis-icon-glow">Analisi in corso</span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
            </div>
          </div>
        )}
      </div>

      {/* === COL 3: CHAT - JARVIS Style === */}
      <div
        className={`
        jarvis-sidebar flex flex-col z-20 transition-all duration-300
        ${isMobile
          ? `fixed right-0 top-0 h-full transform transition-transform duration-300 ${
              rightSidebarOpen ? 'translate-x-0 w-[90vw] max-w-[280px]' : 'translate-x-full w-[90vw] max-w-[280px]'
            }`
          : `${sidebarCollapsed ? 'w-[60px]' : 'w-[260px]'}`
        }
        style={{ 
          background: 'linear-gradient(180deg, rgba(9,9,11,0.85) 0%, rgba(18,18,20,0.85) 100%)',
          borderRight: '1px solid rgba(96, 165, 250, 0.30)',
          boxShadow: '5px 0 15px rgba(96, 165, 250, 0.20)'
        }}
      `}
      >
        <div className={`jarvis-sidebar-header ${isMobile ? 'p-4' : 'p-6'} flex items-center justify-between`}>
          {!sidebarCollapsed || isMobile ? (
            <div className="relative flex items-center gap-2">
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
              <h2
                className={`font-light bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent ${isMobile ? 'text-base' : 'text-lg'} jarvis-icon-glow`}
              >
                D.A.I
              </h2>
            </div>
          ) : (
            <div className="text-2xl bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent jarvis-icon-glow">
              💬
            </div>
          )}
          {!isMobile && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="jarvis-button w-8 h-8 flex items-center justify-center rounded-lg jarvis-icon-glow"
              title={sidebarCollapsed ? 'Espandi chat' : 'Collassa chat'}
            >
              {sidebarCollapsed ? '◀' : '▶'}
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => setRightSidebarOpen(false)}
              className="jarvis-button w-8 h-8 flex items-center justify-center rounded-lg jarvis-icon-glow"
            >
              ✕
            </button>
          )}
        </div>

        {(!sidebarCollapsed || isMobile) && (
          <>
            <div 
              className="flex-1 overflow-y-auto p-4 border-l"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(16px)',
                borderLeftColor: 'rgba(96, 165, 250, 0.25)'
              }}
            >
              {history.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`max-w-[90%] ${msg.sender === 'user' ? '' : 'w-full'} relative`}>
                    <div
                      className={`p-3 rounded-xl text-sm leading-relaxed relative backdrop-blur-md ${
                        msg.sender === 'user' 
                          ? 'bg-blue-500/30 text-white border border-blue-400/50' 
                          : 'bg-white/10 text-gray-100 border border-white/20'
                      }`}
                    >
                      <div className="relative z-10 whitespace-pre-wrap">{msg.text.trim()}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div 
              className={`jarvis-objective-box border-t ${isMobile ? 'p-3' : 'p-4'}`}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(16px)',
                borderTopColor: 'rgba(96, 165, 250, 0.25)'
              }}
            >
              <div className={`${isMobile ? 'mb-3' : 'mb-4'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className={`text-blue-400/80 ${isMobile ? 'text-[9px]' : 'text-[10px]'} font-light uppercase tracking-[0.2em]`}>
                    Domanda Guida
                  </span>
                </div>
                <p className={`text-white font-light ${isMobile ? 'text-sm' : 'text-md'} leading-tight jarvis-icon-glow`}>
                  {ui.sidebar?.card?.question}
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAnalyze(inputText)
                }}
                className="flex gap-2"
              >
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Rispondi..."
                  className={`jarvis-input flex-1 bg-[#09090b] text-white border-blue-400/50 ${isMobile ? 'rounded-lg px-3 py-2 text-xs' : 'rounded-xl px-4 py-3 text-sm'} outline-none`}
                  style={{
                    backgroundColor: 'rgba(9, 9, 11, 0.98)',
                    background: 'rgba(9, 9, 11, 0.98)',
                    color: '#ffffff',
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                  }}
                />
                <button type="submit" className={`jarvis-primary ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3'} ${isMobile ? 'rounded-lg' : 'rounded-xl'} font-bold`}>
                  ↑
                </button>
              </form>

              {ui.sidebar?.card?.hints?.length > 0 && (
                <div className="mt-3 flex gap-2 justify-center">
                  {ui.sidebar.card.hints.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveHint(i)
                        alert(h)
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${activeHint === i ? 'bg-yellow-400 scale-125' : 'bg-gray-600 hover:bg-gray-500'}`}
                      title="Mostra Suggerimento"
                    />
                  ))}
                  <span className="text-[10px] text-gray-500 ml-2 uppercase tracking-wider self-center">Aiuti</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL SETTINGS */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#1E1F20] p-6 rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl">
            <h3 className="font-bold mb-4 text-white">Impostazioni</h3>

            {/* ROI Snap Toggle */}
            <div className="mb-6 pb-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white mb-1">Snap ROI</div>
                  <div className="text-xs text-gray-400">Allinea automaticamente ai bordi del foglio</div>
                </div>
                <button
                  onClick={() => setRoiSnapEnabled(!roiSnapEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${roiSnapEnabled ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${roiSnapEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            </div>

            {/* Video Source */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-white mb-3">Sorgente Video</h4>
              {devices.length === 0 ? (
                <p className="text-sm text-gray-400 p-3 bg-white/5 rounded-lg">
                  Nessuna camera rilevata. Assicurati che la camera sia connessa e che i permessi siano concessi.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {devices.map((d) => {
                    const getTypeIcon = (type: string) => {
                      switch (type) {
                        case 'front':
                          return '📱' // Camera frontale (mobile)
                        case 'back':
                          return '📷' // Camera posteriore
                        case 'external':
                          return '🖥️' // Webcam esterna
                        default:
                          return '📹' // Camera generica
                      }
                    }
                    
                    const getTypeLabel = (type: string) => {
                      switch (type) {
                        case 'front':
                          return 'Frontale'
                        case 'back':
                          return 'Posteriore'
                        case 'external':
                          return 'Webcam Esterna'
                        default:
                          return 'Camera'
                      }
                    }

                    return (
                      <button
                        key={d.deviceId}
                        onClick={() => {
                          setSelectedDeviceId(d.deviceId)
                          setIsSettingsOpen(false)
                        }}
                        className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                          selectedDeviceId === d.deviceId
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:border-blue-400/30 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getTypeIcon(d.type)}</span>
                          <div className="flex-1">
                            <div className="font-medium">{d.label}</div>
                            <div className={`text-xs mt-0.5 ${selectedDeviceId === d.deviceId ? 'text-blue-100' : 'text-gray-400'}`}>
                              {getTypeLabel(d.type)}
                            </div>
                          </div>
                          {selectedDeviceId === d.deviceId && (
                            <svg
                              className="w-5 h-5 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition font-bold"
            >
              CHIUDI
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

