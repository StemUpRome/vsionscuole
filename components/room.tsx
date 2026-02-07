import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TimelineComponent from './TimelineComponent';
import MapComponent from './MapComponent';
import NumberLineComponent from './NumberLineComponent';
import GrammarAnalyzerComponent from './GrammarAnalyzerComponent';
import FractionVisualComponent from './FractionVisualComponent';
// TODO: porta anche il FlashcardViewerComponent quando necessario
const FlashcardViewerComponent = (_props: { rawText: string; sidebarCollapsed?: boolean }) => null;
import { daiObservationService } from '../services/DAIObservationService';
import { domainAdapters } from '../services/DAIDomainAdapters';
import type { ObservationState, TransformationEvent } from '../dai/types';
import type { MotionDetectionResult } from '../dai/live-vision';
import DAIObservationPanel from '../components/DAIObservationPanel';
import {
  LiveModeToggle,
  RoiSelectorOverlay,
  useMotionDetector,
  useStabilizationTrigger,
  captureRoiSnapshot,
} from '../dai/live-vision';
import { ObservationOrchestrator, type ObservationFeedback } from '../dai/services';
import { useAuth } from '../context/AuthContext';
import { canIntervene, getInterventionType, detectUserIntent, type ToolState } from '../dai/speakPolicy';
import type { MeaningfulEvent } from '../dai/meaningfulEvents';
import type { ContextualFlashcard } from '../dai/flashcards/generateFlashcards';
import { shouldAutoTightROI, estimateTextBboxFromCanvas } from '../dai/roiTightening';
import type { ConfirmationState } from '../dai/confidenceGate';
import { shouldIntervene, formatInterventionMessage, detectDoubtReasons, hashText, fingerprintSnapshot, type Intervention, type DoubtReason, type SnapshotAnalysis } from '../dai/autoIntervention';
import { speak as speakTTS, stopSpeaking, isCurrentlySpeaking } from '../tts/ttsClient';
import { filterMeaningfulEvents } from '../dai/meaningfulEvents';
import { createConvaiClient } from '../lib/convai/convaiClient';
import type { ConvaiClient } from 'convai-web-sdk';
// ==========================================
// 1. TIPI E INTERFACCE (Allineati al Server Adattivo)
// ==========================================

type Step = { 
    id: number; 
    label: string; 
    status: 'done' | 'current' | 'pending'; 
};

// SOSTITUISCI la vecchia definizione di ToolType o ArOverlay con questa:

type ToolType = 
    | 'none' 
    | 'balance_scale'       // Matematica
    | 'language_card'       // Lingue (Nuovo)
    | 'molecule_3d'         // Chimica (Nuovo)
    | 'history_timeline'    // Storia (Nuovo)
    | 'geometry_protractor' // Geometria (Nuovo)
    | 'concept_map'         // Mappa concettuale
    | 'number_line'         // BES: Linea dei numeri (Matematica)
    | 'grammar_analyzer'    // BES: Analisi grammaticale (Grammatica)
    | 'fraction_visual'     // BES: Frazioni visuali (Matematica)
    | 'flashcard_viewer';   // BES: Flashcards (Lingue)

    type ArOverlay = {
    show_workspace: boolean;
    data_panel: string[];
    tool_active: ToolType; // Usa il nuovo tipo qui
    tool_content: any;     // content può essere stringa o JSON
};

type SidebarData = {
    steps: Step[];
    card: {
        objective: string;
        question: string;
        hints: string[];
    };
};

type UiState = {
    spoken_text: string;
    ar_overlay: ArOverlay;
    sidebar: SidebarData;
};

type VideoDevice = { deviceId: string; label: string };
type ChatMessage = { sender: 'user' | 'ai'; text: string };

// Estensione per API Web Speech (Chrome/Safari)
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    webkitAudioContext: any;
  }
}

// ==========================================
// 2. STATO INIZIALE NEUTRO
// ==========================================
// Partiamo con step generici. Appena il server risponde, 
// questi verranno sostituiti dagli step specifici della materia (es. Storia o Mate)
const INITIAL_STATE: UiState = {
    spoken_text: "Benvenuto. Inquadra l'esercizio per iniziare.",
    ar_overlay: { 
        show_workspace: true, 
        data_panel: [], 
        tool_active: 'none', 
        tool_content: '' 
    },
    sidebar: {
        steps: [
            { id: 1, label: "Attesa Immagine", status: "current" },
            { id: 2, label: "Analisi", status: "pending" },
            { id: 3, label: "Elaborazione", status: "pending" }
        ],
        card: {
            objective: "Pronto",
            question: "Premi la fotocamera o usa il microfono.",
            hints: []
        }
    }
};
// --- NUOVI STRUMENTI AR DA INCOLLARE PRIMA DELLA FUNZIONE ROOM ---

const LanguageCard = ({ content }: { content: string }) => {
  // Tenta di parsare JSON, altrimenti usa testo semplice
  let data = { word: content, trans: "...", type: "Analisi" };
  try { data = JSON.parse(content); } catch(e) {}
  if(typeof content === 'string' && !content.startsWith('{')) data.word = content;

  return (
      <div className="absolute top-32 right-12 bg-white/95 p-5 rounded-2xl shadow-2xl border-l-4 border-green-500 animate-fade-in-left z-30 w-64">
          <div className="flex justify-between items-start mb-2">
              <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded uppercase">{data.type}</span>
              <span className="text-gray-400 text-xs">🇬🇧 ➝ 🇮🇹</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{data.word}</div>
          <div className="text-lg text-green-600 font-medium italic border-t border-gray-100 pt-2 mt-2">{data.trans}</div>
      </div>
  );
};

const MoleculeTool = ({ content }: { content: string }) => {
  return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-zoom-in z-20">
          <div className="relative w-48 h-48">
              {/* Atomo O */}
              <div className="absolute top-1/2 left-1/2 w-14 h-14 bg-red-500 rounded-full shadow-inner flex items-center justify-center text-white font-bold text-xl transform -translate-x-1/2 -translate-y-1/2 z-10 border-2 border-white/50">O</div>
              {/* Legami */}
              <div className="absolute top-1/2 left-1/2 w-24 h-2 bg-gray-400 transform -translate-y-1/2 -rotate-45 origin-left rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 w-24 h-2 bg-gray-400 transform -translate-y-1/2 rotate-135 origin-left rounded-full"></div>
              {/* Atomi H */}
              <div className="absolute top-8 left-8 w-10 h-10 bg-white rounded-full shadow-inner flex items-center justify-center text-gray-800 font-bold border-2 border-gray-300">H</div>
              <div className="absolute bottom-8 right-8 w-10 h-10 bg-white rounded-full shadow-inner flex items-center justify-center text-gray-800 font-bold border-2 border-gray-300">H</div>
          </div>
          <div className="text-center mt-2"><span className="bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur border border-white/20 font-mono">{content || "H₂O"}</span></div>
      </div>
  );
};
// HistoryTool rimosso: sostituito da TimelineComponent in ArToolRegistry

// MapTool rimosso: sostituito da MapComponent in ArToolRegistry

// ==========================================
// HOLOGRAFIC TOOLS COMPONENTS
// ==========================================

type AreaSelection = { x: number; y: number; w: number; h: number } | null;
type DrawPath = { id: string; points: Array<{ x: number; y: number }>; color: string; width: number; type: 'pen' | 'highlight' | 'eraser' };
type HintPointer = { x: number; y: number; hint?: string } | null;
type DrawToolType = 'pen' | 'highlight' | 'eraser';

// Toolbar Component - Strumenti Didattici (Draggable)
const HolographicToolbar = ({ 
  activeTool, 
  onToolChange,
  drawToolType,
  onDrawToolChange,
  hasDrawings,
  onClearDrawings,
  position,
  onPositionChange
}: { 
  activeTool: string; 
  onToolChange: (tool: 'none' | 'hint' | 'area' | 'draw') => void;
  drawToolType: DrawToolType;
  onDrawToolChange: (type: DrawToolType) => void;
  hasDrawings: boolean;
  onClearDrawings: () => void;
  position: { x: number; y: number };
  onPositionChange: (x: number, y: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const newX = Math.max(0, Math.min(viewportWidth - 200, e.clientX - dragStartRef.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 300, e.clientY - dragStartRef.current.y));
      onPositionChange(newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onPositionChange]);

  return (
    <div 
      className={`toolbar fixed bg-[#18181b]/95 backdrop-blur-md border border-[#6366F1]/30 ${
        typeof window !== 'undefined' && window.innerWidth < 768
          ? 'rounded-lg p-1.5'
          : 'rounded-xl p-2'
      } flex flex-col gap-1 sm:gap-2 shadow-2xl z-50`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header Draggable */}
      <div className="flex items-center gap-2 pb-1 border-b border-white/10">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Strumenti</div>
        <div className="flex-1" />
        <div className="w-1 h-1 bg-gray-600 rounded-full" />
      </div>

      {/* Strumenti Principali */}
      <div className="flex gap-2">
        <button
          onClick={() => onToolChange(activeTool === 'hint' ? 'none' : 'hint')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTool === 'hint' 
              ? 'bg-[#6366F1] text-white shadow-lg' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
          title="Indicatore 👆"
        >
          👆
        </button>
        <button
          onClick={() => onToolChange(activeTool === 'area' ? 'none' : 'area')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTool === 'area' 
              ? 'bg-[#6366F1] text-white shadow-lg' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
          title="Seleziona Area ⬜"
        >
          ⬜
        </button>
        <button
          onClick={() => onToolChange(activeTool === 'draw' ? 'none' : 'draw')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTool === 'draw' 
              ? 'bg-[#6366F1] text-white shadow-lg' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
          title="Disegna ✏️"
        >
          ✏️
        </button>
      </div>

      {/* Strumenti Disegno (mostrati solo quando draw è attivo) */}
      {activeTool === 'draw' && (
        <div className="flex gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => onDrawToolChange('pen')}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
              drawToolType === 'pen' 
                ? 'bg-[#6366F1] text-white' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            title="Penna"
          >
            ✒️
          </button>
          <button
            onClick={() => onDrawToolChange('highlight')}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
              drawToolType === 'highlight' 
                ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            title="Evidenziatore"
          >
            🖍️
          </button>
          <button
            onClick={() => onDrawToolChange('eraser')}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
              drawToolType === 'eraser' 
                ? 'bg-red-500/30 text-red-400 border border-red-500/50' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            title="Gomma"
          >
            🧹
          </button>
        </div>
      )}

      {/* Pulisci Tutto */}
      {hasDrawings && (
        <button
          onClick={onClearDrawings}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          title="Cancella tutto"
        >
          🗑️ Pulisci
        </button>
      )}
    </div>
  );
};

// Strumenti di Supporto - Componente per Sidebar
const SupportToolsSection = ({ 
  onActivateTool, 
  currentTool,
  spokenText,
  isExpanded,
  onToggleExpand
}: { 
  onActivateTool: (toolType: ToolType, content: string) => void;
  currentTool: ToolType;
  spokenText?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => {
  const supportTools: Array<{ type: ToolType; icon: string; label: string; color: string; category: string }> = [
    // Matematica
    { type: 'fraction_visual', icon: '🥧', label: 'Frazioni', color: '#6366F1', category: 'Matematica' },
    { type: 'number_line', icon: '📏', label: 'Linea Numeri', color: '#10b981', category: 'Matematica' },
    { type: 'balance_scale', icon: '⚖️', label: 'Bilancia', color: '#8b5cf6', category: 'Matematica' },
    { type: 'geometry_protractor', icon: '📐', label: 'Geometria', color: '#06b6d4', category: 'Geometria' },
    // Lingua e Grammatica
    { type: 'grammar_analyzer', icon: '📝', label: 'Grammatica', color: '#f59e0b', category: 'Lingua' },
    { type: 'flashcard_viewer', icon: '🎴', label: 'Flashcard', color: '#ec4899', category: 'Lingua' },
    { type: 'language_card', icon: '🌐', label: 'Vocabolario', color: '#14b8a6', category: 'Lingua' },
    // Scienze
    { type: 'molecule_3d', icon: '⚗️', label: 'Molecole', color: '#f97316', category: 'Scienze' },
    // Studio e Organizzazione
    { type: 'concept_map', icon: '🗺️', label: 'Mappa Concettuale', color: '#a855f7', category: 'Studio' },
    { type: 'history_timeline', icon: '📅', label: 'Timeline', color: '#ef4444', category: 'Storia' },
  ];

  return (
    <div className="border-t border-white/5">
      <button
        onClick={onToggleExpand}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🛠️</span>
          <span className="text-sm font-bold text-indigo-300">Strumenti di Supporto</span>
        </div>
        <span className={`text-xs text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 max-h-[400px] overflow-y-auto">
          {supportTools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => {
                if (currentTool === tool.type) {
                  onActivateTool('none', '');
                } else {
                  onActivateTool(tool.type, spokenText || '');
                }
              }}
              className={`jarvis-button w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold transition-all relative overflow-hidden group ${
                currentTool === tool.type
                  ? 'border-[#6366F1]/60 shadow-[0_0_25px_rgba(99,102,241,0.4)]'
                  : 'border-[#6366F1]/20'
              }`}
              style={currentTool === tool.type ? {
                background: `linear-gradient(135deg, ${tool.color}15, ${tool.color}08)`,
                borderColor: tool.color + '80'
              } : {}}
              title={tool.label}
            >
              <span className={`text-base relative z-10 ${currentTool === tool.type ? 'jarvis-icon-glow' : ''}`}>{tool.icon}</span>
              <span className="flex-1 text-left text-white relative z-10">{tool.label}</span>
              {currentTool === tool.type && (
                <span className="w-2 h-2 rounded-full animate-pulse relative z-10" style={{ backgroundColor: tool.color, boxShadow: `0 0 10px ${tool.color}` }}></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Hint Pointer Tool - Dito Puntatore Didattico
const HintPointerTool = ({ 
  hintPointer,
  onRemove
}: { 
  hintPointer: HintPointer;
  onRemove: () => void;
}) => {
  if (!hintPointer) return null;

  return (
    <>
      {/* Dito Puntatore Animato */}
      <div 
        className="absolute pointer-events-auto z-40 cursor-move group"
        style={{
          left: `${hintPointer.x * 100}%`,
          top: `${hintPointer.y * 100}%`,
          transform: 'translate(-50%, -100%)'
        }}
        onContextMenu={(e) => { e.preventDefault(); onRemove(); }}
      >
        <div className="relative">
          {/* Animazione pulsante */}
          <div className="absolute inset-0 animate-ping opacity-30">
            <div className="w-16 h-16 bg-[#6366F1] rounded-full" />
          </div>
          
          {/* Dito SVG Semplificato */}
          <div className="relative z-10 w-8 h-8 bg-[#6366F1] rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <span className="text-white text-lg">👆</span>
          </div>

          {/* Bottone Rimuovi */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="remove-btn absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex items-center justify-center z-20"
            title="Rimuovi (click destro per rimuovere)"
          >
            ×
          </button>
          
          {/* Hint Text (se presente) */}
          {hintPointer.hint && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#18181b]/95 backdrop-blur-md border border-[#6366F1]/50 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap pointer-events-none">
              <div className="text-xs text-white font-medium">{hintPointer.hint}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Area Selector Tool
const AreaSelectorTool = ({ 
  areaSelection
}: { 
  areaSelection: AreaSelection;
}) => {
  if (!areaSelection) return null;

  return (
    <div
      className="absolute border-2 border-dashed border-[#6366F1] bg-[#6366F1]/10 pointer-events-none z-40"
      style={{
        left: `${areaSelection.x * 100}%`,
        top: `${areaSelection.y * 100}%`,
        width: `${areaSelection.w * 100}%`,
        height: `${areaSelection.h * 100}%`
      }}
    >
      <div className="absolute -top-6 left-0 bg-[#6366F1] text-white text-[10px] font-bold px-2 py-1 rounded">
        Area selezionata
      </div>
    </div>
  );
};

// Draw Tool Component - Migliorato
const DrawTool = ({ 
  drawings,
  workspaceRef
}: { 
  drawings: DrawPath[];
  workspaceRef: React.RefObject<HTMLDivElement | null>;
}) => {
  // Controllo di sicurezza multiplo
  if (!workspaceRef.current) return null;
  
  const rect = workspaceRef.current.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0 || isNaN(rect.width) || isNaN(rect.height)) {
    return null;
  }

  const width = rect.width;
  const height = rect.height;

  return (
    <svg 
      className="absolute inset-0 pointer-events-none z-35"
      style={{ width: '100%', height: '100%' }}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
    >
      {drawings.map((path) => {
        if (!path || !path.points || !Array.isArray(path.points)) return null;
        
        // Filtra punti validi (deve essere tra 0 e 1 per coordinate normalizzate)
        const validPoints = path.points.filter(p => 
          p && 
          typeof p.x === 'number' && typeof p.y === 'number' && 
          !isNaN(p.x) && !isNaN(p.y) &&
          p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1
        );
        
        if (validPoints.length === 0) return null;
        
        const pointsString = validPoints.map(p => `${p.x * width},${p.y * height}`).join(' ');
        
        if (path.type === 'eraser') {
          // Gomma: maschera nera
          return (
            <polyline
              key={path.id}
              points={pointsString}
              fill="none"
              stroke="rgba(0,0,0,0.9)"
              strokeWidth={path.width || 30}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        } else if (path.type === 'highlight') {
          // Evidenziatore: giallo semitrasparente e largo
          return (
            <polyline
              key={path.id}
              points={pointsString}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={path.width || 20}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
            />
          );
        } else {
          // Penna normale
          return (
            <polyline
              key={path.id}
              points={pointsString}
              fill="none"
              stroke={path.color || '#6366F1'}
              strokeWidth={path.width || 3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
      })}
    </svg>
  );
};

// (PinMarker rimosso - non più usato con strumenti didattici)

// Componente "Switch" che decide cosa mostrare
// Componente "Switch" che decide cosa mostrare
const ArToolRegistry = ({ type, content, sidebarCollapsed }: { type: any; content: string; sidebarCollapsed?: boolean }) => {
    switch (type) {
      case 'language_card': return <LanguageCard content={content} />;
      case 'molecule_3d': return <MoleculeTool content={content} />;
      case 'history_timeline': return <TimelineComponent rawText={content} />;
      case 'concept_map': return <MapComponent rawText={content} sidebarCollapsed={sidebarCollapsed} />;
      // BES Tools
      case 'number_line': return <NumberLineComponent rawText={content} sidebarCollapsed={sidebarCollapsed} />;
      case 'grammar_analyzer': return <GrammarAnalyzerComponent rawText={content} sidebarCollapsed={sidebarCollapsed} />;
      case 'fraction_visual': return <FractionVisualComponent rawText={content} sidebarCollapsed={sidebarCollapsed} />;
      case 'flashcard_viewer': return <FlashcardViewerComponent rawText={content} sidebarCollapsed={sidebarCollapsed} />;
      default: return null;
    }
  };
  export default function Room({ avatarId: avatarIdProp }: { avatarId?: string } = {}) {
    const router = useRouter();
    const navigate = (path: string | number) => {
      if (typeof path === 'number') {
        if (path === -1) router.back();
        else router.push('/dashboard');
      } else {
        router.push(path);
      }
    };
    const { currentStudent, token } = useAuth();
  // token è disponibile se necessario per future chiamate API
  // ==========================================
  // 3. RIFERIMENTI E HOOKS
  // ==========================================
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Engine Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Convai: client e stato (avatar parlante)
  const convaiClientRef = useRef<ConvaiClient | null>(null);
  const [convaiReady, setConvaiReady] = useState(false);
  const [convaiError, setConvaiError] = useState<string | null>(null);

  // Modalità ingresso: Visual (webcam full) vs Avatar (avatar al centro, webcam PiP)
  const hasAvatarMode = Boolean(avatarIdProp);
  const [avatarDisplayData, setAvatarDisplayData] = useState<{ image: string; name: string } | null>(null);
  const [avatarPosition, setAvatarPosition] = useState({ xPercent: 82, yPercent: 22 });
  const avatarDragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startXPercent: number; startYPercent: number }>({ isDragging: false, startX: 0, startY: 0, startXPercent: 0, startYPercent: 0 });
  const avatarSize = { w: 240, h: 320 };

  // ==========================================
  // 4. STATI APPLICAZIONE
  // ==========================================
  const [ui, setUi] = useState<UiState>(INITIAL_STATE);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [activeHint, setActiveHint] = useState<number>(-1);

  // Hardware
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCameraPaused, setIsCameraPaused] = useState(false);

  // Audio Visualizer
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 15, 10]);

  // ROI State
  const [roiSnapEnabled, setRoiSnapEnabled] = useState(false);
  const [roiBounds, setRoiBounds] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }); // percentuali
  const [roiIsDragging, setRoiIsDragging] = useState(false);
  const [roiIsResizing, setRoiIsResizing] = useState<string | null>(null); // 'nw' | 'ne' | 'sw' | 'se'
  const roiDragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, startW: 0, startH: 0 });
  const roiEmaRef = useRef({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const roiLockRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const edgeCacheRef = useRef<{ horizontal: number[], vertical: number[], timestamp: number } | null>(null);
  const edgeDetectionThrottleRef = useRef<number | null>(null);
  
  // Holographic Tools State - Strumenti Didattici
  const [activeTool, setActiveTool] = useState<'none' | 'hint' | 'area' | 'draw'>('none');
  const [drawToolType, setDrawToolType] = useState<DrawToolType>('pen');
  const [hintPointer, setHintPointer] = useState<HintPointer>(null);
  const [areaSelection, setAreaSelection] = useState<AreaSelection>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const areaSelectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const [drawings, setDrawings] = useState<DrawPath[]>([]);
  const currentDrawPathRef = useRef<DrawPath | null>(null);
  const isDrawingRef = useRef(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 200 : 0,
    y: 100,
  }));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [supportToolsExpanded, setSupportToolsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  
  // Determina se c'è un tool AR attivo
  const hasActiveTool = ui.ar_overlay?.tool_active && ui.ar_overlay.tool_active !== 'none';

  // Dati avatar per modalità Avatar (sempre quando c'è avatarId, così l'avatar si vede subito)
  useEffect(() => {
    if (typeof window === 'undefined' || !avatarIdProp) {
      setAvatarDisplayData(null);
      return;
    }
    try {
      const raw = localStorage.getItem('user_avatars');
      const avatars = raw ? JSON.parse(raw) : [];
      const avatar = avatars.find((a: { id?: string }) => String(a?.id) === String(avatarIdProp));
      if (avatar) {
        setAvatarDisplayData({
          image: avatar.image || '/avatar-1.png',
          name: avatar.name || 'Avatar',
        });
      } else {
        setAvatarDisplayData(null);
      }
    } catch {
      setAvatarDisplayData(null);
    }
  }, [avatarIdProp]);

  // Convai: inizializza con convaiCharacterId dell'avatar passato dall'URL (avatarId) così l'identità è quella dell'avatar (es. Regus)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let characterId: string | null = null;
    try {
      const raw = localStorage.getItem('user_avatars');
      const avatars = raw ? JSON.parse(raw) : [];
      if (avatarIdProp) {
        const avatar = avatars.find((a: { id?: string }) => String(a?.id) === String(avatarIdProp));
        characterId = avatar?.convaiCharacterId ?? null;
      } else if (avatars.length > 0) {
        const withConvai = avatars.find((a: { convaiCharacterId?: string }) => a.convaiCharacterId);
        characterId = withConvai?.convaiCharacterId ?? null;
      }
    } catch {
      characterId = null;
    }
    if (!characterId?.trim()) {
      setConvaiReady(false);
      setConvaiError(null);
      convaiClientRef.current = null;
      return;
    }
    const convaiApiKey = process.env.NEXT_PUBLIC_CONVAI_API_KEY;
    if (!convaiApiKey?.trim() || convaiApiKey.trim() === 'tuo_codice') {
      console.warn('ERRORE: API Key Convai mancante nel file .env');
    }
    setConvaiError(null);
    console.log('Inizializzazione Convai con ID:', characterId);
    createConvaiClient({ characterId: characterId.trim(), languageCode: 'it-IT', enableAudio: true })
      .then((client) => {
        convaiClientRef.current = client;
        client.setResponseCallback((response: unknown) => {
          const resp = response as { hasAudioResponse?: () => boolean; getAudioResponse?: () => { getTextData?: () => string } };
          if (resp.hasAudioResponse?.() && resp.getAudioResponse?.()) {
            const text = resp.getAudioResponse?.()?.getTextData?.();
            // Debug: in console il testo che torna da Regus (Convai)
            if (text) {
              console.log('[Convai setResponseCallback] Testo da Regus:', text);
              setHistory((prev) => [...prev, { sender: 'ai', text }]);
            }
          }
        });
        client.onAudioPlay(() => setIsAiSpeaking(true));
        client.onAudioStop(() => setIsAiSpeaking(false));
        // Fallback audio: assicurarsi che l'elemento audio di Convai non sia silenziato/bloccato
        try {
          const player = client.getAudioPlayer?.();
          if (player?.getAudioElement) {
            const el = player.getAudioElement();
            if (el) {
              el.muted = false;
              el.volume = 1;
              console.log('[Convai] Audio element unmuted, volume=1');
            }
          }
        } catch (e) {
          console.warn('[Convai] Impossibile impostare audio element:', e);
        }
        setConvaiReady(true);
      })
      .catch((err) => {
        console.error('[Convai] Init error:', err);
        setConvaiError(err instanceof Error ? err.message : 'Convai non disponibile');
        setConvaiReady(false);
        convaiClientRef.current = null;
      });
    return () => {
      convaiClientRef.current = null;
      setConvaiReady(false);
    };
  }, [avatarIdProp]);

  // DAI Observation State
  const [daiState, setDaiState] = useState<ObservationState | null>(null);
  const orchestratorRef = useRef<ObservationOrchestrator | null>(null);
  
  // DAI Enhanced State
  const [meaningfulEvents, setMeaningfulEvents] = useState<MeaningfulEvent[]>([]);
  const [lastInterventionAt, setLastInterventionAt] = useState(0);
  const [lastAudioAt, setLastAudioAt] = useState<number | null>(null); // Track last AUDIO intervention for 12s cooldown
  const [lastSpokenPhrase, setLastSpokenPhrase] = useState<string | undefined>(undefined); // For audio deduplication
  const [lastSpokenReason, setLastSpokenReason] = useState<DoubtReason | undefined>(undefined); // Last spoken doubt reason
  const [lastSpokenByReason, setLastSpokenByReason] = useState<Map<DoubtReason, number>>(new Map()); // Per-reason cooldown timestamps
  const [recentSnapshots, setRecentSnapshots] = useState<SnapshotAnalysis[]>([]); // Last 3 snapshots for hysteresis
  const [roiStable, setRoiStable] = useState(true); // ROI stability check (simplified - could be enhanced with motion detection)
  const [lastTextFeedbackHash, setLastTextFeedbackHash] = useState<string | undefined>(undefined); // Hash of last text feedback
  const [lastTextFeedbackAt, setLastTextFeedbackAt] = useState<number | null>(null); // Timestamp of last text feedback
  const [lastSnapshotFingerprint, setLastSnapshotFingerprint] = useState<string | undefined>(undefined); // Fingerprint of last snapshot
  const [lastSnapshotAt, setLastSnapshotAt] = useState<number | null>(null); // Timestamp of last snapshot
  const [confirmationState, setConfirmationState] = useState<ConfirmationState | null>(null);
  const [contextualFlashcards, setContextualFlashcards] = useState<ContextualFlashcard[]>([]);
  const [roiMode, setRoiMode] = useState<'manual' | 'auto'>('manual');
  const lastChangeTimeRef = useRef(0);
  const prevAnalysisRef = useRef<{ rawText: string; confidence: number } | null>(null);
  
  // Auto Intervention Toggles
  const [autoInterventionEnabled, setAutoInterventionEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  
  // Live Vision State
  const [liveVisionEnabled, setLiveVisionEnabled] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [motionIntensity, setMotionIntensity] = useState(0);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false); // LED verde quando AI elabora risposta automatica
  
  // Auto-analisi: movimento > 10% per 2s, poi sotto 3% → trigger
  const highMotionStartRef = useRef<number | null>(null);
  const lastAutoAnalysisAtRef = useRef<number>(0);
  const AUTO_ANALYSIS_COOLDOWN_MS = 30000; // 30s tra un'analisi automatica e l'altra
  const AUTO_ANALYSIS_MESSAGE = 'Analisi automatica: l\'utente ha completato un\'azione. Verifica la correttezza della scrittura';
  const MOTION_HIGH_THRESHOLD = 0.10;  // 10%
  const MOTION_LOW_THRESHOLD = 0.03;   // 3%
  const MOTION_HIGH_DURATION_MS = 2000; // 2 secondi
  
  // Live Vision Hooks (rilevamento movimento già limitato alle coordinate ROI da useMotionDetector)
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
  });

  // Ref per chiamare handleSendMessage dall'auto-trigger (popolato dopo la definizione di handleSendMessage)
  const handleSendMessageRef = useRef<(msg: string) => Promise<void>>(() => Promise.resolve());

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
        });
      },
    }
  );

  // Initialize Observation Orchestrator
  useEffect(() => {
    orchestratorRef.current = new ObservationOrchestrator({
      onFeedback: (feedback: ObservationFeedback) => {
        const now = Date.now();
        
        // Aggiorna meaningful events
        if (feedback.meaningfulEvents) {
          setMeaningfulEvents(feedback.meaningfulEvents);
        }
        
        // Aggiorna flashcards contestuali
        if (feedback.flashcards) {
          setContextualFlashcards(feedback.flashcards);
        }
        
        // Gestisci confirmation flow
        if (feedback.needsConfirmation && feedback.confirmationQuestion) {
          setConfirmationState({
            status: 'pending',
            question: feedback.confirmationQuestion,
            rawContent: '',
          });
          return; // Non procedere finché non confermato
        }
        
        // Check speak policy
        const toolState: ToolState = hasActiveTool 
          ? { isOpen: true, toolId: ui.ar_overlay?.tool_active || 'none' }
          : { isOpen: false };
        
        const timeSinceLastChange = now - lastChangeTimeRef.current;
        const userIntent = detectUserIntent(motionDetected, timeSinceLastChange, toolState.isOpen);
        
        const canInterveneResult = canIntervene({
          intent: userIntent,
          toolState,
          lastInterventionAt,
          now,
          newObservation: !!feedback.message,
          hasIssue: !feedback.isValidTransition,
        });
        
        if (!canInterveneResult) {
          // Non intervenire, ma aggiorna solo lo stato
          return;
        }
        
        const interventionType = getInterventionType({
          intent: userIntent,
          toolState,
          lastInterventionAt,
          now,
          newObservation: !!feedback.message,
          hasIssue: !feedback.isValidTransition,
        });
        
        if (interventionType === 'silent') {
          // Solo aggiorna stato, nessun messaggio
          return;
        }
        
        // Dispatch UI feedback (BES-friendly guidance)
        if (feedback.message && (interventionType === 'full' || interventionType === 'minimal')) {
          // Add to chat history as AI message
          setHistory(prev => [...prev, { 
            sender: 'ai', 
            text: feedback.message || '' 
          }]);
          setLastInterventionAt(now);
          
          // Show tool suggestion if available
          if (feedback.suggestedTool && interventionType === 'full') {
            console.log('[DAI] Suggested tool:', feedback.suggestedTool);
            // Trigger tool activation for support tools
            const besTools = ['number_line', 'grammar_analyzer', 'fraction_visual', 'flashcard_viewer'];
            if (besTools.includes(feedback.suggestedTool)) {
              setUi(prev => ({
                ...prev,
                ar_overlay: {
                  ...prev.ar_overlay,
                  tool_active: feedback.suggestedTool as ToolType || 'none',
                  tool_content: feedback.message || '',
                },
              }));
            }
          }
        }

        // Show validation feedback if transition invalid
        if (!feedback.isValidTransition && feedback.validationResult?.message && interventionType === 'full') {
          setHistory(prev => [...prev, { 
            sender: 'ai', 
            text: feedback.validationResult!.message || '' 
          }]);
          setLastInterventionAt(now);
        }
        
        // Auto-tight ROI se bbox disponibile
        if (feedback.bbox && roiMode === 'auto' && videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx && videoRef.current.readyState >= 2) {
            ctx.drawImage(videoRef.current, 0, 0);
            const textBbox = estimateTextBboxFromCanvas(canvas, {
              x: roiBounds.x,
              y: roiBounds.y,
              width: roiBounds.w,
              height: roiBounds.h,
            });
            
            if (textBbox) {
              const shouldTight = shouldAutoTightROI(textBbox, {
                x: roiBounds.x,
                y: roiBounds.y,
                width: roiBounds.w,
                height: roiBounds.h,
              }, 0.8);
              
              if (shouldTight.shouldTight && shouldTight.newBounds) {
                // Mostra toast o auto-aggiorna ROI
                console.log('[DAI] Auto-tight ROI suggested:', shouldTight.newBounds);
                // TODO: Mostra toast "Aggancio al testo (annulla)" o auto-applica
              }
            }
          }
        }
      },
      onObservableDetected: (observable) => {
        console.log('[DAI] Observable detected:', observable.type, observable.content.substring(0, 50));
      },
      onTransformationDetected: (event) => {
        console.log('[DAI] Transformation detected:', event.transformation, event.observableType);
      },
    });

    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.stop();
      }
    };
  }, []);

  // Start observation when live vision is enabled
  useEffect(() => {
    if (!orchestratorRef.current || !liveVisionEnabled) return;

    const sessionId = `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    orchestratorRef.current.initialize(sessionId, {
      x: roiBounds.x,
      y: roiBounds.y,
      width: roiBounds.w,
      height: roiBounds.h,
    });

    // Update state from orchestrator
    const state = orchestratorRef.current.getState();
    if (state) {
      setDaiState(state);
    }

    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.stop();
      }
    };
  }, [liveVisionEnabled]);

  // Update ROI bounds in orchestrator
  useEffect(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.updateROIBounds({
        x: roiBounds.x,
        y: roiBounds.y,
        width: roiBounds.w,
        height: roiBounds.h,
      });
    }
  }, [roiBounds.x, roiBounds.y, roiBounds.w, roiBounds.h]);

  // Process OCR text when available (from handleAnalyze or snapshots)
  const processOCRObservable = useCallback(async (ocrText: string, confidence: number = 0.8) => {
    if (!orchestratorRef.current || !liveVisionEnabled || !ocrText) return;

    // Aggiorna tempo ultimo cambiamento
    lastChangeTimeRef.current = Date.now();

    // Process OCR text as observable through orchestrator
    // This will: classify, detect transformations, call adapters, produce feedback
    orchestratorRef.current.processSnapshot(
      ocrText,
      {
        x: roiBounds.x,
        y: roiBounds.y,
        width: roiBounds.w,
        height: roiBounds.h,
      },
      confidence
    );

    // Update state
    const state = orchestratorRef.current.getState();
    if (state) {
      setDaiState(state);
      
      // AUTO INTERVENTION: Check if we should intervene automatically
      if (autoInterventionEnabled && state.observables.size > 0) {
        const latestObservable = Array.from(state.observables.values()).pop();
        if (latestObservable) {
          const meaningfulEventsList = filterMeaningfulEvents(
            state.transformations.slice(-10),
            state.observables
          );
          
          // Detect user intent
          const timeSinceLastChange = Date.now() - lastChangeTimeRef.current;
          const userIntent = detectUserIntent(motionDetected, timeSinceLastChange, hasActiveTool);
          
          // Check ROI stability (simplified: consider stable if motion intensity is low)
          // In production, this could be enhanced with more sophisticated ROI tracking
          const currentRoiStable = motionIntensity < 0.3; // Low motion = stable ROI
          setRoiStable(currentRoiStable);
          
          // Compute snapshot fingerprint for novelty gating
          const currentSnapshotFingerprint = fingerprintSnapshot({
            rawText: ocrText,
            normalized: latestObservable.content,
            observableType: latestObservable.type,
            confidence: confidence,
          });
          
          // Check for intervention (shouldIntervene will compute current doubt reasons internally)
          const intervention = shouldIntervene({
            liveIntent: userIntent,
            toolOpen: hasActiveTool,
            lastInterventionAt: lastInterventionAt || null,
            lastAudioAt: lastAudioAt, // Pass last audio time for 12s cooldown
            now: Date.now(),
            analysis: {
              rawText: ocrText,
              normalized: latestObservable.content,
              confidence: confidence,
              observableType: latestObservable.type,
              // signConfidence could be extracted from analysis if available
              // For now, leave undefined (will use fallback detection)
            },
            prevState: prevAnalysisRef.current || undefined,
            meaningfulEvents: meaningfulEventsList,
            _motionScore: motionIntensity,
            lastSpokenPhrase, // Pass last spoken phrase for deduplication
            lastSpokenReason, // Pass last spoken reason for deduplication
            lastSpokenByReason, // Pass per-reason cooldown map
            recentSnapshots: recentSnapshots.length > 0 ? recentSnapshots : undefined, // Pass previous snapshots (for hysteresis)
            roiStable: currentRoiStable, // Pass ROI stability check
          });

          // After intervention check, compute and store current snapshot for next hysteresis check
          const currentDoubtReasons = detectDoubtReasons({
            analysis: {
              rawText: ocrText,
              confidence: confidence,
              observableType: latestObservable.type,
              // signConfidence could be extracted from analysis if available
              // For now, leave undefined (will use fallback detection)
            },
            meaningfulEvents: meaningfulEventsList,
          });

          const currentSnapshot: SnapshotAnalysis = {
            timestamp: Date.now(),
            doubtReasons: currentDoubtReasons,
            confidence: confidence,
          };
          
          // Update recent snapshots (keep last 3) AFTER intervention check
          // This snapshot will be used in NEXT call to shouldIntervene for hysteresis
          setRecentSnapshots(prev => [...prev, currentSnapshot].slice(-3));
          
          // Update snapshot fingerprint tracking (for novelty gating)
          setLastSnapshotFingerprint(currentSnapshotFingerprint);
          setLastSnapshotAt(Date.now());

          if (intervention) {
            // RULE 3: Stop any current speech if user starts writing OR motion detected
            if (userIntent === 'writing_in_progress' || motionDetected) {
              stopSpeaking();
              // Still show text if it's a doubt intervention
              if (intervention.reason === 'doubt') {
                const message = formatInterventionMessage(intervention);
                setHistory(prev => [...prev, {
                  sender: 'ai',
                  text: message,
                }]);
              }
              return;
            }

            // Display intervention message (text in DAI panel)
            // Update text feedback tracking (text gate already passed in shouldIntervene)
            const message = formatInterventionMessage(intervention);
            const textHash = hashText(intervention.text);
            setLastTextFeedbackHash(textHash);
            setLastTextFeedbackAt(Date.now());
            
            setHistory(prev => [...prev, {
              sender: 'ai',
              text: message,
            }]);

            // RULE 1: Audio is allowed ONLY in state="doubt"
            // RULE 4: Audio = attention only (1 sentence, < 2.5s), Text = guiding question
            if (intervention.reason === 'doubt' && intervention.speak && ttsEnabled && intervention.audioPhrase) {
              // Speak ONLY the short audio phrase (not the text question)
              (async () => {
                try {
                  await speakTTS(intervention.audioPhrase!, { lang: 'it-IT', rate: 1.0, pitch: 1.0, volume: 0.9 });
                  // Update last audio time for 12s cooldown
                  setLastAudioAt(Date.now());
                  // Store spoken phrase and reason for deduplication
                  setLastSpokenPhrase(intervention.audioPhrase!);
                  if (intervention.doubtReason) {
                    setLastSpokenReason(intervention.doubtReason);
                    // Update per-reason cooldown map (45 seconds)
                    setLastSpokenByReason(prev => {
                      const updated = new Map(prev);
                      updated.set(intervention.doubtReason!, Date.now());
                      return updated;
                    });
                  }
                  console.log('[DAI] Doubt intervention - Reason:', intervention.doubtReason, 'Audio:', intervention.audioPhrase, 'Text:', message);
                } catch (err) {
                  console.error('[TTS] Error speaking:', err);
                }
              })();
            } else {
              // No audio (step_completed or cooldown/dedup)
              console.log('[DAI] Intervention (no audio):', intervention.reason, message);
            }

            // Update last intervention time (for general tracking)
            setLastInterventionAt(Date.now());

            // Suggest tool if available
            if (intervention.suggestedToolId) {
              const besTools = ['number_line', 'grammar_analyzer', 'fraction_visual', 'flashcard_viewer'];
              if (besTools.includes(intervention.suggestedToolId)) {
                setUi(prev => ({
                  ...prev,
                  ar_overlay: {
                    ...prev.ar_overlay,
                    tool_active: intervention.suggestedToolId as ToolType || 'none',
                    tool_content: intervention.text,
                  },
                }));
              }
            }
          }

          // Update previous analysis for deduplication
          prevAnalysisRef.current = {
            rawText: ocrText,
            confidence: confidence,
          };
        }
      }
    }
  }, [liveVisionEnabled, roiBounds, motionDetected, hasActiveTool, autoInterventionEnabled, ttsEnabled, lastInterventionAt, lastAudioAt, lastSpokenPhrase, lastSpokenReason, lastSpokenByReason, recentSnapshots, lastTextFeedbackHash, lastTextFeedbackAt, lastSnapshotFingerprint, lastSnapshotAt, motionIntensity]);

  // Capture ROI snapshot function (for periodic snapshots)
  // Captures when motion stops (stable 900-1200ms) and sends to server for OCR
  const handleCaptureSnapshot = useCallback(async () => {
    if (!videoRef.current || !liveVisionEnabled || !orchestratorRef.current || isAnalyzing) return;
    if (isCameraPaused) return;

    try {
      setIsAnalyzing(true);

      // Capture frame
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx || videoRef.current.readyState < 2) return;

      ctx.drawImage(videoRef.current, 0, 0);
      
      // Extract ROI region
      const roiX = Math.floor(roiBounds.x * canvas.width);
      const roiY = Math.floor(roiBounds.y * canvas.height);
      const roiW = Math.floor(roiBounds.w * canvas.width);
      const roiH = Math.floor(roiBounds.h * canvas.height);
      
      const roiCanvas = document.createElement('canvas');
      roiCanvas.width = roiW;
      roiCanvas.height = roiH;
      const roiCtx = roiCanvas.getContext('2d');
      if (!roiCtx) return;

      roiCtx.drawImage(canvas, roiX, roiY, roiW, roiH, 0, 0, roiW, roiH);
      const imgBase64 = roiCanvas.toDataURL('image/jpeg', 0.8);

      console.log('[Live Vision] Snapshot captured, sending to server for OCR...');

      // Send to server for OCR analysis (Next.js env)
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:3001'

      const response = await fetch(`${apiBase}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          imageBase64: imgBase64,
          userQuestion: 'cosa sto osservando?',
          studentProfile: currentStudent ? {
            name: currentStudent.name,
            grade: currentStudent.grade,
            schoolType: currentStudent.schoolType,
            schoolLevel: currentStudent.schoolLevel,
          } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('OCR analysis failed');
      }

      const data = await response.json();
      
      // Extract OCR text and confidence
      const ocrText = data.extract?.ocr_text;
      const ocrConfidence = data.extract?.confidence || 0.8;
      
      if (ocrText && typeof ocrText === 'string' && ocrText.trim().length > 0) {
        // Process through DAI pipeline (includes auto intervention)
        await processOCRObservable(ocrText, ocrConfidence);
      }

      console.log('[Live Vision] Snapshot analyzed:', {
        timestamp: Date.now(),
        ocrText: ocrText?.substring(0, 50),
        confidence: ocrConfidence,
      });
    } catch (error) {
      console.error('[Live Vision] Snapshot capture/analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [liveVisionEnabled, roiBounds, processOCRObservable, isAnalyzing, isCameraPaused, currentStudent, token]);

  // Initialize Observation Orchestrator
  useEffect(() => {
    orchestratorRef.current = new ObservationOrchestrator({
      onFeedback: (feedback: ObservationFeedback) => {
        // Dispatch UI feedback (BES-friendly guidance)
        if (feedback.message) {
          // Add to chat history as AI message (BES-friendly guidance)
          setHistory(prev => [...prev, { 
            sender: 'ai', 
            text: feedback.message || '' 
          }]);
          
          // Show tool suggestion if available
          if (feedback.suggestedTool) {
            console.log('[DAI] Suggested tool:', feedback.suggestedTool);
            // Optionally trigger tool activation
            if (feedback.suggestedTool === 'number_line' || feedback.suggestedTool === 'grammar_analyzer') {
              setUi(prev => ({
                ...prev,
                ar_overlay: {
                  ...prev.ar_overlay,
                  tool_active: feedback.suggestedTool as ToolType || 'none',
                  tool_content: feedback.message || '',
                },
              }));
            }
          }
        }

        // Show validation feedback if transition invalid
        if (!feedback.isValidTransition && feedback.validationResult?.message) {
          setHistory(prev => [...prev, { 
            sender: 'ai', 
            text: feedback.validationResult!.message || '' 
          }]);
        }
      },
      onObservableDetected: (observable) => {
        console.log('[DAI] Observable detected:', observable.type, observable.content.substring(0, 50));
      },
      onTransformationDetected: (event) => {
        console.log('[DAI] Transformation detected:', event.transformation, event.observableType);
      },
    });

    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.stop();
      }
    };
  }, []);

  // Start observation when live vision is enabled
  useEffect(() => {
    if (!orchestratorRef.current || !liveVisionEnabled) return;

    const sessionId = `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    orchestratorRef.current.initialize(sessionId, {
      x: roiBounds.x,
      y: roiBounds.y,
      width: roiBounds.w,
      height: roiBounds.h,
    });

    // Update state from orchestrator
    const state = orchestratorRef.current.getState();
    if (state) {
      setDaiState(state);
    }

    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.stop();
      }
    };
  }, [liveVisionEnabled]);

  // Update ROI bounds in orchestrator
  useEffect(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.updateROIBounds({
        x: roiBounds.x,
        y: roiBounds.y,
        width: roiBounds.w,
        height: roiBounds.h,
      });
    }
  }, [roiBounds.x, roiBounds.y, roiBounds.w, roiBounds.h]);

  // Periodic snapshot capture when live vision is enabled
  useEffect(() => {
    if (!liveVisionEnabled || isCameraPaused) return;

    const interval = setInterval(() => {
      handleCaptureSnapshot();
    }, 2000); // Every 2 seconds

    return () => clearInterval(interval);
  }, [liveVisionEnabled, isCameraPaused, handleCaptureSnapshot]);
  
  // Collassa sidebar quando un tool AR è attivo (tranne 'none') - opzionale, può essere manuale
  // Rimosso auto-collapse, l'utente può collassare manualmente se vuole 

  // Detect mobile e gestisci resize
    useEffect(() => {
      const handleResize = () => {
        const mobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
      setIsMobile(mobile);
      if (mobile) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ==========================================
  // DAI OBSERVATION SETUP
  // ==========================================
  
  // Registra domain adapters al mount
  useEffect(() => {
    domainAdapters.forEach(adapter => {
      daiObservationService.registerDomainAdapter(adapter);
    });

    return () => {
      daiObservationService.destroy();
    };
  }, []);

  // Avvia osservazione quando ROI è configurato e camera è pronta
  useEffect(() => {
    if (!videoRef.current || isCameraPaused || !containerRef.current) return;
    if (videoRef.current.readyState < 2) return;

    // Avvia osservazione con bounds ROI attuali
    const sessionId = daiObservationService.startObservation(
      {
        x: roiBounds.x,
        y: roiBounds.y,
        width: roiBounds.w,
        height: roiBounds.h,
      },
      {
        onStateChange: (state) => {
          setDaiState(state);
          // Aggiorna ROI bounds se necessario (stabilizzazione)
          setRoiBounds({
            x: state.roiBounds.x,
            y: state.roiBounds.y,
            w: state.roiBounds.width,
            h: state.roiBounds.height,
          });
        },
        onTransformation: (event: TransformationEvent) => {
          console.log('[DAI] Transformation detected:', event);
          // Reagire alle trasformazioni con suggerimenti se necessario
          if (daiState) {
            const observable = daiState.observables.get(event.observableId);
            if (observable) {
              const adapter = daiObservationService.getDomainAdapter(observable);
              if (adapter) {
                const analysis = adapter.analyze(observable, daiState);
                if (analysis.intervention !== 'none' && analysis.suggestion) {
                  // Opzionale: mostra suggerimento
                  console.log('[DAI] Suggestion:', analysis.suggestion);
                }
              }
            }
          }
        },
        onMotionDetected: (result: MotionDetectionResult) => {
          if (result.hasMotion) {
            console.log('[DAI] Motion detected:', result.motionRegions.length, 'regions');
          }
        },
      }
    );

    console.log('[DAI] Observation started:', sessionId);

    return () => {
      daiObservationService.stopObservation();
    };
  }, [videoRef.current?.readyState, isCameraPaused]);

  // Aggiorna ROI bounds nel servizio DAI quando cambiano
  useEffect(() => {
    daiObservationService.updateROIBounds({
      x: roiBounds.x,
      y: roiBounds.y,
      width: roiBounds.w,
      height: roiBounds.h,
    });
  }, [roiBounds.x, roiBounds.y, roiBounds.w, roiBounds.h]);

  // ==========================================
  // 5. LIFECYCLE & SETUP
  // ==========================================

  // Scroll automatico chat
  useEffect(() => { 
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [history]);

  // Cleanup totale quando esci dalla pagina
  useEffect(() => {
      return () => {
          window.speechSynthesis.cancel();
          if (audioContextRef.current) audioContextRef.current.close();
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          if (recognitionRef.current) recognitionRef.current.stop();
      };
  }, []);

  // Inizializzazione Camera
  useEffect(() => {
    const getDevices = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            const allDevs = await navigator.mediaDevices.enumerateDevices();
            const vDevs = allDevs
                .filter(d => d.kind === 'videoinput')
                .map(d => ({ deviceId: d.deviceId, label: d.label || `Cam ${d.deviceId.slice(0,4)}` }));
            
            setDevices(vDevs);
            if (vDevs.length > 0 && !selectedDeviceId) setSelectedDeviceId(vDevs[0].deviceId);
        } catch (e) { console.error("Err Cam:", e); }
    };
    getDevices();
  }, []);

  // Avvio Stream Video
  useEffect(() => {
    if (!selectedDeviceId || isCameraPaused) return;
    const startStream = async () => {
        try {
            // Prova prima con risoluzione alta, poi fallback
            let stream: MediaStream | null = null;
            try {
                // Prova prima con risoluzione molto alta
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        deviceId: { exact: selectedDeviceId }, 
                        width: { ideal: 1920, min: 1280 },
                        height: { ideal: 1080, min: 720 },
                        frameRate: { ideal: 30 }
                    } 
                });
            } catch (e) {
                console.warn('[Camera] Fallback a risoluzione media:', e);
                try {
                    // Fallback a risoluzione media
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            deviceId: { exact: selectedDeviceId },
                            width: { ideal: 1280, min: 640 },
                            height: { ideal: 720, min: 480 }
                        } 
                    });
                } catch (e2) {
                    console.warn('[Camera] Fallback a risoluzione base:', e2);
                    // Ultimo fallback: qualsiasi risoluzione disponibile
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { deviceId: { exact: selectedDeviceId } } 
                    });
                }
            }
            
            if (stream && videoRef.current) {
                videoRef.current.srcObject = stream;
                // Forza il rendering ad alta qualità
                videoRef.current.setAttribute('playsinline', 'true');
                videoRef.current.setAttribute('webkit-playsinline', 'true');
                
                // Verifica e log della risoluzione effettiva
                videoRef.current.addEventListener('loadedmetadata', () => {
                    if (videoRef.current) {
                        console.log('[Camera] Risoluzione video:', {
                            width: videoRef.current.videoWidth,
                            height: videoRef.current.videoHeight,
                            readyState: videoRef.current.readyState
                        });
                    }
                });
            }
        } catch (e) { 
            console.error("Err Stream:", e);
        }
    };
    startStream();
  }, [selectedDeviceId, isCameraPaused]);

  // ==========================================
  // 6. MOTORE AUDIO (Visualizer & TTS)
  // ==========================================

  const animateVisualizer = () => {
      if (isAiSpeaking) {
          // Simulazione onde quando parla l'AI
          setAudioLevels([Math.random()*40+10, Math.random()*50+20, Math.random()*40+10]);
      } else if (analyserRef.current && isListening) {
          // Onde reali quando parla l'utente
          const d = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(d);
          // Preleva frequenze basse, medie, alte
          setAudioLevels([d[0]/2, d[10]/2, d[20]/2]);
      } else {
          // Riposo
          setAudioLevels([10, 15, 10]);
      }
      animationFrameRef.current = requestAnimationFrame(animateVisualizer);
  };

  const speak = (text: string) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT';
      u.onstart = () => { setIsAiSpeaking(true); animateVisualizer(); };
      u.onend = () => { setIsAiSpeaking(false); if(!isListening) setAudioLevels([10,15,10]); };
      window.speechSynthesis.speak(u);
  };

  const startMicrophone = async () => {
      window.speechSynthesis.cancel(); setIsAiSpeaking(false);
      if (convaiClientRef.current) {
          try { convaiClientRef.current.startAudioChunk(); setIsListening(true); animateVisualizer(); } catch (e) { console.warn('[Convai] startAudioChunk:', e); }
          return;
      }
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const ana = ctx.createAnalyser(); ana.fftSize = 64;
          const src = ctx.createMediaStreamSource(stream);
          src.connect(ana);
          audioContextRef.current = ctx;
          analyserRef.current = ana;
          setIsListening(true);
          animateVisualizer();
          if ('webkitSpeechRecognition' in window) {
              const rec = new window.webkitSpeechRecognition();
              rec.lang = 'it-IT';
              rec.continuous = false;
              rec.interimResults = false;
              rec.onresult = (e: any) => { stopMicrophone(); handleAnalyze(e.results[0][0].transcript); };
              rec.onerror = () => stopMicrophone();
              rec.start();
              recognitionRef.current = rec;
          }
      } catch (e) { console.error(e); alert("Errore Microfono"); }
  };

  const stopMicrophone = () => {
      if (convaiClientRef.current) {
          try { convaiClientRef.current.endAudioChunk(); } catch (e) { console.warn('[Convai] endAudioChunk:', e); }
          setIsListening(false);
          setAudioLevels([10, 15, 10]);
          return;
      }
      audioContextRef.current?.close(); recognitionRef.current?.stop();
      setIsListening(false); setAudioLevels([10, 15, 10]);
  };

  // ==========================================
  // ROI: Edge Detection (Semplice Sobel-like con cache)
  // ==========================================
  const detectEdges = async (forceRefresh: boolean = false): Promise<{ horizontal: number[], vertical: number[] }> => {
    // Cache valida per 500ms
    const CACHE_DURATION = 500;
    const now = Date.now();
    
    if (!forceRefresh && edgeCacheRef.current && (now - edgeCacheRef.current.timestamp) < CACHE_DURATION) {
      return { horizontal: edgeCacheRef.current.horizontal, vertical: edgeCacheRef.current.vertical };
    }
    
    if (!videoRef.current || !containerRef.current) return { horizontal: [], vertical: [] };
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { horizontal: [], vertical: [] };
    
    const vid = videoRef.current;
    const container = containerRef.current;
    
    // Limitiamo la risoluzione per performance (max 640px)
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(container.clientWidth, container.clientHeight));
    canvas.width = Math.floor(container.clientWidth * scale);
    canvas.height = Math.floor(container.clientHeight * scale);
    
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Converti a grayscale
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }
    
    // Edge detection orizzontale (bordi verticali) - semplificato: solo righe campionate
    const horizontal: number[] = [];
    const vertical: number[] = [];
    const sampleStep = Math.max(1, Math.floor(canvas.height / 100)); // max 100 sample
    
    for (let y = 1; y < canvas.height - 1; y += sampleStep) {
      let maxEdge = 0;
      for (let x = 1; x < canvas.width - 1; x++) {
        const idx = y * canvas.width + x;
        const edge = Math.abs(gray[idx - 1] - gray[idx + 1]);
        maxEdge = Math.max(maxEdge, edge);
      }
      horizontal.push(maxEdge);
    }
    
    // Edge detection verticale (bordi orizzontali) - semplificato: solo colonne campionate
    const colSampleStep = Math.max(1, Math.floor(canvas.width / 100)); // max 100 sample
    for (let x = 1; x < canvas.width - 1; x += colSampleStep) {
      let maxEdge = 0;
      for (let y = 1; y < canvas.height - 1; y++) {
        const idx = y * canvas.width + x;
        const edge = Math.abs(gray[idx - canvas.width] - gray[idx + canvas.width]);
        maxEdge = Math.max(maxEdge, edge);
      }
      vertical.push(maxEdge);
    }
    
    // Aggiorna cache
    edgeCacheRef.current = { horizontal, vertical, timestamp: now };
    
    return { horizontal, vertical };
  };

  // ROI: Snap a bordi forti (con throttling per performance)
  const snapToEdges = async (x: number, y: number, w: number, h: number) => {
    if (!roiSnapEnabled) return { x, y, w, h };
    
    // Throttle edge detection: solo ogni 100ms durante il drag/resize
    if (edgeDetectionThrottleRef.current) {
      clearTimeout(edgeDetectionThrottleRef.current);
    }
    
    return new Promise<{ x: number, y: number, w: number, h: number }>((resolve) => {
      edgeDetectionThrottleRef.current = window.setTimeout(async () => {
        const { horizontal, vertical } = await detectEdges();
        if (horizontal.length === 0 || vertical.length === 0) {
          resolve({ x, y, w, h });
          return;
        }
        
        const container = containerRef.current;
        if (!container) {
          resolve({ x, y, w, h });
          return;
        }
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        
        const SNAP_DISTANCE = 20; // pixel distance per snap
        
        // Calcola threshold percentuale per edge detection (30% del massimo edge strength)
        const maxEdge = Math.max(...horizontal, ...vertical);
        if (maxEdge === 0) {
          resolve({ x, y, w, h });
          return;
        }
        const edgeThreshold = maxEdge * 0.3;
        
        let snappedX = x;
        let snappedY = y;
        let snappedW = w;
        let snappedH = h;
        
        // Snap orizzontale (bordi verticali) per x e x+w
        const absX = x * containerW;
        const absX2 = (x + w) * containerW;
        
        for (let i = 0; i < vertical.length; i++) {
          if (vertical[i] > edgeThreshold) {
            const edgeX = (i / vertical.length) * containerW;
            if (Math.abs(edgeX - absX) < SNAP_DISTANCE) {
              snappedX = i / vertical.length;
            }
            if (Math.abs(edgeX - absX2) < SNAP_DISTANCE) {
              snappedW = (i / vertical.length) - snappedX;
            }
          }
        }
        
        // Snap verticale (bordi orizzontali) per y e y+h
        const absY = y * containerH;
        const absY2 = (y + h) * containerH;
        
        for (let i = 0; i < horizontal.length; i++) {
          if (horizontal[i] > edgeThreshold) {
            const edgeY = (i / horizontal.length) * containerH;
            if (Math.abs(edgeY - absY) < SNAP_DISTANCE) {
              snappedY = i / horizontal.length;
            }
            if (Math.abs(edgeY - absY2) < SNAP_DISTANCE) {
              snappedH = (i / horizontal.length) - snappedY;
            }
          }
        }
        
        resolve({ x: snappedX, y: snappedY, w: snappedW, h: snappedH });
      }, 100); // 100ms throttle
    });
  };

  // ROI: EMA Smoothing
  const applyEmaSmoothing = (newBounds: { x: number, y: number, w: number, h: number }, alpha: number = 0.15) => {
    const ema = roiEmaRef.current;
    ema.x = alpha * newBounds.x + (1 - alpha) * ema.x;
    ema.y = alpha * newBounds.y + (1 - alpha) * ema.y;
    ema.w = alpha * newBounds.w + (1 - alpha) * ema.w;
    ema.h = alpha * newBounds.h + (1 - alpha) * ema.h;
    return { ...ema };
  };

  // ROI: Hysteresis Lock
  const updateRoiWithLock = (newBounds: { x: number, y: number, w: number, h: number }) => {
    const THRESHOLD = 0.02; // 2% movimento per lock/unlock
    const ema = roiEmaRef.current;
    
    const dx = Math.abs(newBounds.x - ema.x);
    const dy = Math.abs(newBounds.y - ema.y);
    const dw = Math.abs(newBounds.w - ema.w);
    const dh = Math.abs(newBounds.h - ema.h);
    
    const movement = Math.max(dx, dy, dw, dh);
    
    // Hysteresis: unlock se movimento > threshold, lock se movimento < threshold/2
    if (movement > THRESHOLD) {
      roiLockRef.current = false;
    } else if (movement < THRESHOLD / 2) {
      roiLockRef.current = true;
    }
    
    // Se locked e movimento piccolo, usa valori smoothed
    if (roiLockRef.current && movement < THRESHOLD) {
      const smoothed = applyEmaSmoothing(newBounds, 0.1);
      setRoiBounds(smoothed);
    } else {
      const smoothed = applyEmaSmoothing(newBounds);
      setRoiBounds(smoothed);
    }
  };

  // ROI: Start Drag
  const roiStartDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setRoiIsDragging(true);
    roiDragStartRef.current = {
      x, y,
      startX: roiBounds.x,
      startY: roiBounds.y,
      startW: roiBounds.w,
      startH: roiBounds.h
    };
  };

  // ROI: Start Resize
  const roiStartResize = (corner: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setRoiIsResizing(corner);
    roiDragStartRef.current = {
      x, y,
      startX: roiBounds.x,
      startY: roiBounds.y,
      startW: roiBounds.w,
      startH: roiBounds.h
    };
  };

  // ROI: Mouse Move Handler
  useEffect(() => {
    let snapPromise: Promise<{ x: number, y: number, w: number, h: number }> | null = null;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!roiIsDragging && !roiIsResizing) return;
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width;
      const mouseY = (e.clientY - rect.top) / rect.height;
      
      const deltaX = mouseX - roiDragStartRef.current.x;
      const deltaY = mouseY - roiDragStartRef.current.y;
      
      let newBounds = { ...roiBounds };
      
      if (roiIsDragging) {
        // Drag
        newBounds.x = Math.max(0, Math.min(1 - roiBounds.w, roiDragStartRef.current.startX + deltaX));
        newBounds.y = Math.max(0, Math.min(1 - roiBounds.h, roiDragStartRef.current.startY + deltaY));
      } else if (roiIsResizing) {
        // Resize
        const { startX, startY, startW, startH } = roiDragStartRef.current;
        
        switch (roiIsResizing) {
          case 'nw': // top-left
            newBounds.x = Math.max(0, Math.min(startX + deltaX, startX + startW - 0.1));
            newBounds.y = Math.max(0, Math.min(startY + deltaY, startY + startH - 0.1));
            newBounds.w = Math.max(0.1, startW - deltaX);
            newBounds.h = Math.max(0.1, startH - deltaY);
            break;
          case 'ne': // top-right
            newBounds.y = Math.max(0, Math.min(startY + deltaY, startY + startH - 0.1));
            newBounds.w = Math.max(0.1, Math.min(1 - startX, startW + deltaX));
            newBounds.h = Math.max(0.1, startH - deltaY);
            break;
          case 'sw': // bottom-left
            newBounds.x = Math.max(0, Math.min(startX + deltaX, startX + startW - 0.1));
            newBounds.w = Math.max(0.1, startW - deltaX);
            newBounds.h = Math.max(0.1, Math.min(1 - startY, startH + deltaY));
            break;
          case 'se': // bottom-right
            newBounds.w = Math.max(0.1, Math.min(1 - startX, startW + deltaX));
            newBounds.h = Math.max(0.1, Math.min(1 - startY, startH + deltaY));
            break;
        }
      }
      
      // Apply smoothing e lock immediatamente (senza snap per performance)
      updateRoiWithLock(newBounds);
      
      // Applica snap in modo asincrono (throttled)
      if (roiSnapEnabled) {
        snapPromise = snapToEdges(newBounds.x, newBounds.y, newBounds.w, newBounds.h);
        snapPromise.then((snapped) => {
          updateRoiWithLock(snapped);
        }).catch(() => {
          // Ignora errori durante snap
        });
      }
    };
    
    const handleMouseUp = () => {
      setRoiIsDragging(false);
      setRoiIsResizing(null);
      // Final snap quando rilasci
      if (snapPromise && roiSnapEnabled) {
        snapPromise.then((snapped) => {
          updateRoiWithLock(snapped);
        });
      }
    };
    
    if (roiIsDragging || roiIsResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (edgeDetectionThrottleRef.current) {
        clearTimeout(edgeDetectionThrottleRef.current);
      }
    };
  }, [roiIsDragging, roiIsResizing, roiBounds, roiSnapEnabled]);

  // ==========================================
  // 7. MOTORE ANALISI (Chiamata al Server)
  // ==========================================

  // Messaggio fisso del pulsante OSSERVA: in hasAvatarMode la cattura va fatta SOLO per questo messaggio, così i messaggi di solo testo usano solo Convai.
  const OSSERVA_MESSAGE =
    "Nell'immagine c'è testo/numeri scritti a mano. Prima scrivi esattamente ciò che leggi (es. 'Vedo: 15 + 27 = 33'), poi correggi eventuali errori e dai il feedback educativo.";

  // Funzione per inviare messaggi alla chat AI (OpenAI)
  const handleSendMessage = async (message: string) => {
      if (isAnalyzing || !message.trim()) return;
      setIsAnalyzing(true);
      
      // Aggiungi il messaggio dell'utente alla cronologia
      const userMessage: ChatMessage = { sender: 'user', text: message.trim() };
      setHistory(prev => [...prev, userMessage]);
      setInputText("");

      try {
          // Cattura dalla webcam SOLO quando serve: non in Avatar+Convai per messaggi di solo testo (solo per OSSERVA)
          let imageBase64: string | null = null;
          const needImage =
            !hasAvatarMode ||
            !convaiClientRef.current ||
            message.trim() === OSSERVA_MESSAGE;

          if (needImage && !isCameraPaused && videoRef.current && videoRef.current.readyState >= 2) {
              const vid = videoRef.current;
              const videoWidth = vid.videoWidth || vid.clientWidth || 1920;
              const videoHeight = vid.videoHeight || vid.clientHeight || 1080;
              const maxDimFull = 1024;
              // Area di lavoro: risoluzione maggiore e qualità superiore per leggere meglio numeri/testo scritti a mano
              const maxDimRoi = 1536;
              const qualityRoi = 0.92;

              const captureFrameWithFlip = (): HTMLCanvasElement | null => {
                  if (videoWidth <= 0 || videoHeight <= 0) return null;
                  const canvas = document.createElement('canvas');
                  canvas.width = videoWidth;
                  canvas.height = videoHeight;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return null;
                  ctx.save();
                  ctx.scale(-1, 1);
                  ctx.translate(-videoWidth, 0);
                  ctx.drawImage(vid, 0, 0, videoWidth, videoHeight);
                  ctx.restore();
                  return canvas;
              };

              const captureAndEncode = (srcCanvas: HTMLCanvasElement, w: number, h: number, maxDim: number, quality: number): string | null => {
                  if (w <= 0 || h <= 0) return null;
                  const scale = Math.min(1, maxDim / Math.max(w, h));
                  const outW = Math.round(w * scale);
                  const outH = Math.round(h * scale);
                  const out = document.createElement('canvas');
                  out.width = outW;
                  out.height = outH;
                  const outCtx = out.getContext('2d');
                  if (!outCtx) return null;
                  outCtx.drawImage(srcCanvas, 0, 0, w, h, 0, 0, outW, outH);
                  const dataUrl = out.toDataURL('image/jpeg', quality);
                  if (!dataUrl || !dataUrl.startsWith('data:image/jpeg;base64,')) return null;
                  if (dataUrl.length < 100) return null;
                  return dataUrl;
              };

              const fullCanvas = captureFrameWithFlip();
              if (fullCanvas) {
                  if (liveVisionEnabled && roiBounds.w > 0 && roiBounds.h > 0) {
                      const roiX = Math.floor(roiBounds.x * videoWidth);
                      const roiY = Math.floor(roiBounds.y * videoHeight);
                      const roiW = Math.floor(roiBounds.w * videoWidth);
                      const roiH = Math.floor(roiBounds.h * videoHeight);
                      const roiCanvas = document.createElement('canvas');
                      roiCanvas.width = roiW;
                      roiCanvas.height = roiH;
                      const roiCtx = roiCanvas.getContext('2d');
                      if (roiCtx) {
                          roiCtx.drawImage(fullCanvas, roiX, roiY, roiW, roiH, 0, 0, roiW, roiH);
                          imageBase64 = captureAndEncode(roiCanvas, roiW, roiH, maxDimRoi, qualityRoi);
                      }
                  } else {
                      imageBase64 = captureAndEncode(fullCanvas, videoWidth, videoHeight, maxDimFull, 0.8);
                  }
              }
          }

          // In modalità Avatar con Convai: messaggio solo testo → risposta esclusivamente da Regus (Character ID), niente OpenAI
          if (hasAvatarMode && convaiClientRef.current && !imageBase64) {
              try {
                  convaiClientRef.current.sendTextStream(message.trim());
              } catch (e) {
                  console.warn('[Convai] sendTextStream:', e);
                  setHistory(prev => [...prev, { sender: 'ai', text: 'Errore invio a Convai. Riprova.' }]);
              }
              return;
          }

          // Con immagine (OSSERVA) o senza Convai: usa OpenAI; se Convai attivo, la risposta viene poi detta da Regus
          const historyToSend = history.slice(-20);
          const response = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  message: message.trim(),
                  imageBase64: imageBase64 ?? null,
                  history: historyToSend
              })
          });

          if (!response.ok) {
              let errMsg = 'Errore di connessione. Riprova.';
              try {
                  const errorData = await response.json();
                  const hint = (errorData as { hint?: string })?.hint;
                  const err = (errorData as { error?: string })?.error;
                  errMsg = hint || err || errMsg;
              } catch {
                  const text = await response.text();
                  if (text) errMsg = `Errore ${response.status}: ${text.slice(0, 200)}`;
              }
              throw new Error(errMsg);
          }

          const data = await response.json();
          const aiText = data.message || 'Nessuna risposta disponibile';
          const aiMessage: ChatMessage = { sender: 'ai', text: aiText };
          setHistory(prev => [...prev, aiMessage]);
          if (convaiClientRef.current) {
            try { convaiClientRef.current.sendTextStream(aiText); } catch (e) { console.warn('[Convai] sendTextStream:', e); }
          }
          
      } catch (error) {
          console.error('Errore nella chat AI:', error);
          let text = error instanceof Error ? error.message : 'Errore di connessione. Riprova.';
          if (text.includes('Failed to fetch') || text.includes('Load failed') || text.includes('NetworkError'))
              text = 'Connessione non riuscita. Controlla la rete o riprova (es. riduci la dimensione dell\'immagine).';
          setHistory(prev => [...prev, { sender: 'ai', text }]);
      } finally {
          setIsAnalyzing(false);
      }
  };

  // Popola ref per auto-trigger e setup callback movimento (dopo definizione handleSendMessage)
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  useEffect(() => {
    setMotionCallback((result) => {
      const intensity = result.motionIntensity;
      setMotionDetected(result.hasMotion);
      setMotionIntensity(intensity);

      console.log('Intensità movimento:', Math.round(intensity * 100) + '%');

      const now = Date.now();
      const highStart = highMotionStartRef.current;

      if (intensity >= MOTION_HIGH_THRESHOLD) {
        if (highStart === null) highMotionStartRef.current = now;
      } else {
        if (intensity < MOTION_LOW_THRESHOLD) {
          if (highStart !== null && (now - highStart) >= MOTION_HIGH_DURATION_MS) {
            if ((now - lastAutoAnalysisAtRef.current) >= AUTO_ANALYSIS_COOLDOWN_MS && !isAnalyzing) {
              lastAutoAnalysisAtRef.current = now;
              highMotionStartRef.current = null;
              setIsAutoAnalyzing(true);
              handleSendMessageRef.current(AUTO_ANALYSIS_MESSAGE)?.finally(() => setIsAutoAnalyzing(false));
            }
          }
          highMotionStartRef.current = null;
        }
      }

      if (result.hasMotion) {
        console.log('[Live Vision] Motion detected (ROI):', {
          intensity: Math.round(intensity * 100) + '%',
          regions: result.motionRegions.length,
        });
      }
    });
  }, [setMotionCallback, isAnalyzing]);

  const handleAnalyze = async (textInput: string) => {
      if (isAnalyzing) return;
      setIsAnalyzing(true);
      
      // Feedback immediato utente
      if (textInput) setHistory(prev => [...prev, { sender: 'user', text: textInput }]);
      setInputText("");

      // Cattura Immagine - Verifica che il video sia pronto e non in pausa
      if (isCameraPaused) {
          setHistory(prev => [...prev, { sender: 'ai', text: "La camera è in pausa. Premi il pulsante play per riattivarla." }]);
          setIsAnalyzing(false);
          return;
      }

      const vid = videoRef.current;
      if (!vid) {
          console.error("Video ref non disponibile");
          setHistory(prev => [...prev, { sender: 'ai', text: "La camera non è disponibile. Verifica le impostazioni." }]);
          setIsAnalyzing(false);
          return;
      }

      // Verifica che il video sia caricato e pronto (readyState >= 2 significa che ha dati)
      if (vid.readyState < 2) {
          console.error("Video non pronto, readyState:", vid.readyState);
          setHistory(prev => [...prev, { sender: 'ai', text: "La camera sta ancora caricando. Attendi un momento e riprova." }]);
          setIsAnalyzing(false);
          return;
      }

      const canvas = document.createElement('canvas');
      const videoWidth = vid.videoWidth || vid.clientWidth || 1920;
      const videoHeight = vid.videoHeight || vid.clientHeight || 1080;
      
      if (videoWidth === 0 || videoHeight === 0) {
          console.error("Dimensioni video non valide:", { videoWidth, videoHeight });
          setHistory(prev => [...prev, { sender: 'ai', text: "Impossibile catturare l'immagine dalla camera. Verifica le impostazioni della camera." }]);
          setIsAnalyzing(false);
          return;
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
          console.error("Impossibile creare contesto canvas");
          setIsAnalyzing(false);
          return;
      }

      // Cattura l'immagine dal video - IMPORTANTE: usa le dimensioni reali del video
      ctx.drawImage(vid, 0, 0, videoWidth, videoHeight);
      
      // Verifica che il canvas abbia effettivamente dei dati (controlla alcuni pixel)
      const imageData = ctx.getImageData(0, 0, Math.min(100, videoWidth), Math.min(100, videoHeight));
      const hasData = imageData.data.some((val, idx) => idx % 4 !== 3 && val !== 0); // Controlla che non sia tutto nero/trasparente
      
      if (!hasData) {
          console.error("⚠️ Canvas vuoto o nero - il video potrebbe non essere visibile");
          setHistory(prev => [...prev, { sender: 'ai', text: "Non riesco a vedere nulla dalla camera. Verifica che la camera sia attiva e che stia inquadrando qualcosa." }]);
          setIsAnalyzing(false);
          return;
      }

      const imgBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // Debug: verifica che l'immagine sia stata catturata
      console.log("📸 Immagine catturata:", { 
          width: canvas.width, 
          height: canvas.height, 
          base64Length: imgBase64.length,
          base64Preview: imgBase64.substring(0, 50) + '...',
          videoReadyState: vid.readyState,
          videoPaused: vid.paused,
          videoWidth: vid.videoWidth,
          videoHeight: vid.videoHeight,
          hasImageData: hasData
      });

      // Verifica che l'immagine non sia vuota (la base64 di un'immagine vuota è molto corta)
      if (imgBase64.length < 1000) {
          console.error("⚠️ Immagine catturata troppo piccola, probabilmente vuota");
          setHistory(prev => [...prev, { sender: 'ai', text: "Errore nella cattura dell'immagine. Prova a riattivare la camera." }]);
          setIsAnalyzing(false);
          return;
      }

      try {
          // Verifica che l'immagine base64 sia valida (deve iniziare con data:image)
          if (!imgBase64.startsWith('data:image/')) {
              console.error("❌ Formato immagine non valido:", imgBase64.substring(0, 50));
              setHistory(prev => [...prev, { sender: 'ai', text: "Errore nel formato dell'immagine. Riprova." }]);
              setIsAnalyzing(false);
              return;
          }

          // Estrai solo la parte base64 (rimuovi il prefisso data:image/jpeg;base64,)
          const base64Data = imgBase64.includes(',') ? imgBase64.split(',')[1] : imgBase64;
          
          console.log("🚀 Invio richiesta al server con:", {
              imageSize: imgBase64.length,
              base64DataSize: base64Data.length,
              question: textInput || "(nessuna domanda)",
              historyLength: history.length,
              imageFormat: imgBase64.substring(5, 20) // Mostra il formato (data:image/jpeg...)
          });

          const apiBase2 =
            process.env.NEXT_PUBLIC_API_BASE ||
            process.env.NEXT_PUBLIC_API_URL ||
            'http://localhost:3001'

          const res = await fetch(`${apiBase2}/api/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  imageBase64: imgBase64, // Invia l'intera stringa data:image/jpeg;base64,...
                  userQuestion: textInput || "", // Assicurati che non sia undefined
                  history: history 
              })
          });

          console.log("📥 Risposta server:", res.status, res.statusText);

          if (!res.ok) throw new Error("Errore Server");

          const data: UiState = await res.json();
          
          console.log("📥 Dati ricevuti dal server:", {
              spoken_text: textInput ? data.spoken_text?.substring(0, 100) + '...' : 'N/A',
              tool_active: data.ar_overlay?.tool_active,
              hasToolContent: !!data.ar_overlay?.tool_content,
              toolContentType: typeof data.ar_overlay?.tool_content,
              toolContentPreview: typeof data.ar_overlay?.tool_content === 'string' 
                  ? data.ar_overlay.tool_content.substring(0, 100) + '...'
                  : 'non-string'
          });

          // Process OCR text through orchestrator if live vision is enabled
          // Extract OCR text from server response if available
          if (liveVisionEnabled && orchestratorRef.current) {
            // Try to get OCR text from response (may need server modification)
            const ocrText = (data as any).extract?.ocr_text;
            if (ocrText && typeof ocrText === 'string' && ocrText.trim().length > 0) {
              processOCRObservable(ocrText);
            }
          }
          
          // Permetti attivazione automatica dei tool BES quando il server rileva il contesto appropriato
          // (es. frazioni → fraction_visual, numeri → number_line, grammatica → grammar_analyzer)
          if (data.ar_overlay?.tool_active && data.ar_overlay.tool_active !== 'none') {
              const lowerInput = (textInput || '').toLowerCase();
              const besTools = ['fraction_visual', 'number_line', 'grammar_analyzer', 'flashcard_viewer'];
              const isBesTool = besTools.includes(data.ar_overlay.tool_active);
              
              // Per concept_map/timeline, manteniamo il filtro (richiesta esplicita)
              if (!isBesTool && data.ar_overlay.tool_active === 'concept_map') {
                  const requestedTool = lowerInput.includes('mappa') || 
                                       lowerInput.includes('concettuale') ||
                                       lowerInput.includes('timeline') ||
                                       lowerInput.includes('grafico') ||
                                       lowerInput.includes('diagramma');
                  
                  if (!requestedTool && textInput) {
                      console.warn("⚠️ Il server ha attivato concept_map senza richiesta esplicita. Disattivazione.");
                      data.ar_overlay.tool_active = 'none';
                      data.ar_overlay.tool_content = '';
                  }
              }
              // Per i tool BES, permettiamo l'attivazione automatica basata sul contesto
          }
          
          // Aggiorna tutta la UI (Step adattivi compresi)
          setUi(data);
          
          // Risposta AI
          setHistory(prev => [...prev, { sender: 'ai', text: data.spoken_text }]);
          if (convaiClientRef.current) {
            try { convaiClientRef.current.sendTextStream(data.spoken_text); } catch (e) { console.warn('[Convai] sendTextStream:', e); }
          } else {
            speak(data.spoken_text);
          }
          setActiveHint(-1);

      } catch (e) {
          console.error("Errore:", e);
          setHistory(prev => [...prev, { sender: 'ai', text: "Errore di connessione. Riprova." }]);
      } finally {
          setIsAnalyzing(false);
      }
  };

  // Drag avatar (solo in modalità Avatar): clamp per non coprire dock/controlli
  const handleAvatarDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!hasAvatarMode) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    avatarDragRef.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      startXPercent: avatarPosition.xPercent,
      startYPercent: avatarPosition.yPercent,
    };
  }, [hasAvatarMode, avatarPosition.xPercent, avatarPosition.yPercent]);

  const handleAvatarDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!avatarDragRef.current.isDragging) return;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((clientX - avatarDragRef.current.startX) / rect.width) * 100;
    const dy = ((clientY - avatarDragRef.current.startY) / rect.height) * 100;
    const xPercent = Math.max(5, Math.min(95, avatarDragRef.current.startXPercent + dx));
    const yPercent = Math.max(5, Math.min(72, avatarDragRef.current.startYPercent + dy));
    setAvatarPosition({ xPercent, yPercent });
  }, []);

  const handleAvatarDragEnd = useCallback(() => {
    avatarDragRef.current.isDragging = false;
  }, []);

  useEffect(() => {
    if (!hasAvatarMode) return;
    window.addEventListener('mousemove', handleAvatarDragMove);
    window.addEventListener('mouseup', handleAvatarDragEnd);
    window.addEventListener('touchmove', handleAvatarDragMove, { passive: true });
    window.addEventListener('touchend', handleAvatarDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleAvatarDragMove);
      window.removeEventListener('mouseup', handleAvatarDragEnd);
      window.removeEventListener('touchmove', handleAvatarDragMove);
      window.removeEventListener('touchend', handleAvatarDragEnd);
    };
  }, [hasAvatarMode, handleAvatarDragMove, handleAvatarDragEnd]);

  // ==========================================
  // 8. RENDER UI (Layout 3 Colonne Completo)
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
            setLeftSidebarOpen(false);
            setRightSidebarOpen(false);
          }}
        />
      )}
      
      {/* === COL 1: SIDEBAR (Percorso Adattivo) - JARVIS Style === */}
      <div className={`
        jarvis-sidebar flex flex-col z-20 relative transition-all duration-300
        ${isMobile 
          ? `fixed left-0 top-0 h-full transform transition-transform duration-300 ${
              leftSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px]'
            }`
          : `${sidebarCollapsed ? 'w-[60px]' : 'w-[300px]'}`
        }
      `}>
         <div className={`jarvis-sidebar-header ${isMobile ? 'p-4' : 'p-6'} flex items-center justify-between`}>
             {(!sidebarCollapsed || isMobile) ? (
                 <>
                     <div className="relative">
                         <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold bg-gradient-to-r from-[#6366F1] to-[#818CF8] bg-clip-text text-transparent jarvis-icon-glow`}>
                             ZenkAI
                         </h1>
                         <p className="text-xs text-gray-400 mt-1 font-semibold tracking-wide">Universal Tutor</p>
                         <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#6366F1] rounded-full animate-pulse"></div>
                     </div>
                 </>
             ) : (
                 <div className="text-2xl bg-gradient-to-r from-[#6366F1] to-[#818CF8] bg-clip-text text-transparent jarvis-icon-glow font-bold">V</div>
             )}
             {!isMobile && (
               <button
                   onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                   className="jarvis-button w-8 h-8 flex items-center justify-center rounded-lg jarvis-icon-glow"
                   title={sidebarCollapsed ? "Espandi sidebar" : "Collassa sidebar"}
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
                     <div className="p-6 space-y-3">
                         {ui.sidebar?.steps?.map((step) => (
                             <div key={step.id} className={`jarvis-step-item flex items-center gap-3 p-3 rounded-xl ${
                                 step.status === 'current' ? 'current' : 
                                 step.status === 'done' ? 'done' : ''
                             }`}>
                                 <div className={`jarvis-step-circle w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                     step.status === 'done' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white done' : 
                                     step.status === 'current' ? 'border-2 border-[#6366F1] text-[#6366F1] bg-gradient-to-br from-[#6366F1]/20 to-[#4F46E5]/20 current' : 
                                     'border border-gray-600/50 text-gray-500 bg-transparent'
                                 }`}>
                                     {step.status === 'done' ? '✓' : step.id}
                                 </div>
                                 <span className={`text-sm font-medium ${step.status === 'current' ? 'text-white' : step.status === 'done' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {step.label}
                                 </span>
                             </div>
                         ))}
                     </div>

                     {/* STRUMENTI DI SUPPORTO */}
                     <SupportToolsSection
                         onActivateTool={(toolType: ToolType, content: string) => {
                             setUi(prev => ({
                                 ...prev,
                                 ar_overlay: {
                                     ...prev.ar_overlay,
                                     tool_active: toolType,
                                     tool_content: content || prev.spoken_text || ''
                                 }
                             }));
                         }}
                         currentTool={ui.ar_overlay?.tool_active || 'none'}
                         spokenText={ui.spoken_text}
                         isExpanded={supportToolsExpanded}
                         onToggleExpand={() => setSupportToolsExpanded(!supportToolsExpanded)}
                     />
                 </div>

                 {/* OBIETTIVO - JARVIS Style */}
                 <div className="jarvis-objective-box p-5">
                     <div className="flex items-center gap-2 mb-2">
                         <div className="w-1.5 h-1.5 bg-[#6366F1] rounded-full animate-pulse"></div>
                         <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6366F1]">Obiettivo</div>
                     </div>
                     <div className="text-sm font-semibold text-white leading-snug jarvis-icon-glow">{ui.sidebar?.card?.objective}</div>
                 </div>
             </>
         )}
      </div>


      {/* === COL 2: CENTER (Video & AR) === */}
      <div ref={containerRef} className={`flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0 ${isMobile ? 'w-full' : ''}`}>
        {/* Un solo <video> sempre montato: in Visual full-screen; in Avatar full-screen con blur come sfondo (stesso ref = cattura OSSERVA a risoluzione piena) */}
        {!isCameraPaused ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute w-full h-full object-cover"
            style={{
              inset: 0,
              ...(hasAvatarMode ? { zIndex: 0, filter: 'none' } : {}),
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              WebkitTransform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              imageRendering: 'auto',
            } as React.CSSProperties}
          />
        ) : (
          <div
            className={`text-gray-500 flex flex-col items-center justify-center gap-4 ${hasAvatarMode ? 'absolute inset-0 z-0 bg-[#18181b]' : 'absolute inset-0'}`}
          >
            <span className="text-6xl">⏸️</span>
            {!hasAvatarMode && <span>Camera Pausa</span>}
          </div>
        )}

        {hasAvatarMode ? (
          /* ---------- MODALITÀ AVATAR: webcam a tutto schermo dietro l'avatar, nessun blur/overlay ---------- */
          <>
            {/* Avatar draggabile - Image-to-Live: pulse da audio, glow viola, effetto bocca */}
            {avatarDisplayData && (() => {
              const isSpeaking = isAiSpeaking || isListening;
              const avgLevel = (audioLevels[0] + audioLevels[1] + audioLevels[2]) / 3;
              const pulseScale = isSpeaking ? 1 + Math.min(0.08, (avgLevel || 0) / 180) : 1;
              const midLevel = audioLevels[1] ?? 0;
              const mouthThreshold = 10; // Soglia bassa: bocca si apre anche con audioLevels[1] > 10
              const mouthOpen = isSpeaking ? (midLevel > mouthThreshold ? 1.028 : 1) : 1;
              const glowIntensity = isSpeaking ? 0.25 + Math.min(0.5, (avgLevel || 0) / 120) : 0;
              const glowSize = isSpeaking ? 24 + Math.min(36, (avgLevel || 0) / 3) : 0;
              return (
              <div
                role="presentation"
                className="absolute z-20 cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden border-2 border-transparent hover:border-[#6366F1]/60 select-none touch-none"
                style={{
                  left: `${avatarPosition.xPercent}%`,
                  top: `${avatarPosition.yPercent}%`,
                  transform: 'translate(-50%, -50%)',
                  width: avatarSize.w,
                  height: avatarSize.h,
                  transition: 'box-shadow 0.12s ease-out, border-color 0.2s',
                  boxShadow: glowIntensity > 0
                    ? `0 0 ${glowSize}px rgba(139, 92, 246, ${glowIntensity}), 0 0 ${glowSize * 1.5}px rgba(99, 102, 241, ${glowIntensity * 0.6})`
                    : 'none',
                  borderColor: glowIntensity > 0 ? 'rgba(139, 92, 246, 0.5)' : undefined,
                }}
                onMouseDown={handleAvatarDragStart}
                onTouchStart={handleAvatarDragStart}
              >
                <div
                  className="w-full h-full transition-transform duration-75 ease-out"
                  style={{
                    transform: `scale(${pulseScale}) scaleY(${mouthOpen})`,
                    transformOrigin: 'center bottom',
                  }}
                >
                  <img
                    src={avatarDisplayData.image}
                    alt={avatarDisplayData.name}
                    className="w-full h-full object-cover object-bottom pointer-events-none block"
                    draggable={false}
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-2 px-3 pointer-events-none">
                  <p className="text-white text-sm font-semibold truncate">{avatarDisplayData.name}</p>
                  {convaiReady && isSpeaking && (
                    <div className="flex gap-0.5 h-3 mt-1 items-end">
                      <div className="w-1 bg-[#818CF8] rounded-full transition-all duration-75" style={{ height: Math.min(12, (audioLevels[0] || 0) / 4) }} />
                      <div className="w-1 bg-[#818CF8] rounded-full transition-all duration-75" style={{ height: Math.min(14, (audioLevels[1] || 0) / 3) }} />
                      <div className="w-1 bg-[#818CF8] rounded-full transition-all duration-75" style={{ height: Math.min(12, (audioLevels[2] || 0) / 4) }} />
                    </div>
                  )}
                </div>
              </div>
              );
            })()}
          </>
        ) : null}

         {/* Live Vision Toggle */}
         <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-6 right-6'} z-50`}>
           <LiveModeToggle
             enabled={liveVisionEnabled}
             onToggle={setLiveVisionEnabled}
           />
         </div>

         {/* Motion Indicator: giallo = movimento, verde = AI sta elaborando risposta automatica */}
         {liveVisionEnabled && (motionDetected || isAutoAnalyzing) && (
           <div className={`absolute ${isMobile ? 'top-2 right-28' : 'top-6 right-32'} z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
             isAutoAnalyzing
               ? 'bg-green-500/20 border-green-500/50'
               : 'bg-yellow-500/20 border border-yellow-500/50'
           }`}>
             <div className={`w-2 h-2 rounded-full animate-pulse ${
               isAutoAnalyzing ? 'bg-green-400' : 'bg-yellow-400'
             }`} />
             <span className={`text-xs font-semibold ${
               isAutoAnalyzing ? 'text-green-400' : 'text-yellow-400'
             }`}>
               {isAutoAnalyzing ? 'Elaborazione...' : `Movimento (${Math.round(motionIntensity * 100)}%)`}
             </span>
           </div>
         )}

         {/* ROI Selector Overlay - solo in modalità Visual */}
         {!hasAvatarMode && liveVisionEnabled && (
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
               });
             }}
             enabled={liveVisionEnabled}
           />
         )}

         {/* TOP TOOLS - JARVIS Style */}
         <div className={`absolute ${isMobile ? 'top-2 left-2' : 'top-6 left-6'} flex gap-3 z-50 flex-wrap`}>
             <button 
                 onClick={()=>navigate('/dashboard')} 
                 className="jarvis-button px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white"
             >
                 <span className="flex items-center gap-2">
                     <span className="w-1 h-1 bg-[#6366F1] rounded-full"></span>
                     Esci
                 </span>
             </button>
             <button 
                 onClick={()=>setIsCameraPaused(!isCameraPaused)} 
                 className="jarvis-button w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-lg sm:text-xl jarvis-icon-glow"
             >
                 {isCameraPaused ? '▶' : '⏸'}
             </button>
             <button 
                 onClick={()=>setIsSettingsOpen(true)} 
                 className="jarvis-button w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-lg sm:text-xl jarvis-icon-glow"
             >
                 ⚙️
             </button>
         </div>

         {/* Toolbar Fluttuante - solo in modalità Visual */}
         {!hasAvatarMode && (
         <HolographicToolbar
             activeTool={activeTool}
             onToolChange={setActiveTool}
             drawToolType={drawToolType}
             onDrawToolChange={setDrawToolType}
             hasDrawings={drawings.length > 0}
             onClearDrawings={() => setDrawings([])}
             position={toolbarPosition}
             onPositionChange={(x, y) => setToolbarPosition({ x, y })}
         />
         )}

         {/* AR: WORKSPACE (Box Blu Interattivo - JARVIS Style) - solo Visual */}
         {!hasAvatarMode && ui.ar_overlay?.show_workspace && (
             <div className="absolute z-10" style={{
                 left: `${roiBounds.x * 100}%`,
                 top: `${roiBounds.y * 100}%`,
                 width: `${roiBounds.w * 100}%`,
                 height: `${roiBounds.h * 100}%`,
             }}>
                 {/* Header Workspace - JARVIS Style */}
                 <div className="workspace-header absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#18181b]/95 via-[#1a1a1f]/95 to-[#18181b]/95 backdrop-blur-xl border border-[#6366F1]/40 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-[#6366F1] whitespace-nowrap shadow-[0_0_30px_rgba(99,102,241,0.3)] jarvis-icon-glow pointer-events-none">
                     <span className="relative">
                         <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#6366F1] rounded-full animate-pulse"></span>
                         AREA DI LAVORO
                         <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#6366F1] rounded-full animate-pulse"></span>
                     </span>
                 </div>
                 
                <div 
                    ref={workspaceRef}
                    className="jarvis-workspace absolute inset-0 rounded-3xl transition-all duration-200"
                    style={{
                        cursor: roiIsDragging ? 'grabbing' : (activeTool === 'hint' || activeTool === 'area' || activeTool === 'draw' ? 'crosshair' : 'grab'),
                        pointerEvents: 'auto',
                        background: 'transparent',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                        filter: 'none',
                        mixBlendMode: 'normal',
                        willChange: 'auto'
                    } as React.CSSProperties}
                 onMouseDown={(e) => {
                     // Evita drag quando si usano strumenti didattici
                     if (activeTool === 'none' && !roiIsDragging) {
                         roiStartDrag(e);
                     } else if (activeTool === 'hint' && workspaceRef.current) {
                         // Posiziona hint pointer
                         const rect = workspaceRef.current.getBoundingClientRect();
                         const x = (e.clientX - rect.left) / rect.width;
                         const y = (e.clientY - rect.top) / rect.height;
                         if ((e.target as HTMLElement).closest('.resize-handle') || 
                             (e.target as HTMLElement).closest('.workspace-header') ||
                             (e.target as HTMLElement).closest('.toolbar')) return;
                         setHintPointer({ x, y });
                     } else if (activeTool === 'area' && workspaceRef.current) {
                         // Inizia selezione area
                         const rect = workspaceRef.current.getBoundingClientRect();
                         const x = (e.clientX - rect.left) / rect.width;
                         const y = (e.clientY - rect.top) / rect.height;
                         if ((e.target as HTMLElement).closest('.resize-handle') || 
                             (e.target as HTMLElement).closest('.workspace-header') ||
                             (e.target as HTMLElement).closest('.toolbar')) return;
                         areaSelectionStartRef.current = { x, y };
                         setIsSelectingArea(true);
                         setAreaSelection({ x, y, w: 0, h: 0 });
                     } else if (activeTool === 'draw' && workspaceRef.current) {
                         // Inizia disegno
                         const rect = workspaceRef.current.getBoundingClientRect();
                         const x = (e.clientX - rect.left) / rect.width;
                         const y = (e.clientY - rect.top) / rect.height;
                         if ((e.target as HTMLElement).closest('.resize-handle') || 
                             (e.target as HTMLElement).closest('.workspace-header') ||
                             (e.target as HTMLElement).closest('.toolbar')) return;
                         isDrawingRef.current = true;
                         
                         // Determina colore e width in base allo strumento
                         let color = '#6366F1';
                         let width = 3;
                         if (drawToolType === 'highlight') {
                             color = '#fbbf24';
                             width = 20;
                         } else if (drawToolType === 'eraser') {
                             color = 'rgba(0,0,0,0.9)';
                             width = 30;
                         }
                         
                        const newPath: DrawPath = {
                            id: `path-${Date.now()}-${Math.random()}`,
                            points: [{ x, y }],
                            color,
                            width,
                            type: drawToolType
                        };
                        currentDrawPathRef.current = newPath;
                        // Usa la forma funzionale di setState per evitare race conditions
                        setDrawings(prev => [...prev, newPath]);
                     }
                 }}
                 onMouseMove={(e) => {
                     if (isSelectingArea && areaSelectionStartRef.current && workspaceRef.current) {
                         const rect = workspaceRef.current.getBoundingClientRect();
                         const currentX = (e.clientX - rect.left) / rect.width;
                         const currentY = (e.clientY - rect.top) / rect.height;
                         const w = currentX - areaSelectionStartRef.current.x;
                         const h = currentY - areaSelectionStartRef.current.y;
                         setAreaSelection({
                             x: areaSelectionStartRef.current.x,
                             y: areaSelectionStartRef.current.y,
                             w,
                             h
                         });
                    } else if (isDrawingRef.current && currentDrawPathRef.current && workspaceRef.current) {
                        const rect = workspaceRef.current.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;
                        
                        // Valida le coordinate prima di aggiungerle
                        const validX = Math.max(0, Math.min(1, x));
                        const validY = Math.max(0, Math.min(1, y));
                        
                        // Cattura il path corrente PRIMA del setState (evita race condition)
                        const currentPath = currentDrawPathRef.current;
                        
                        // Aggiungi punto al path corrente solo se valido
                        if (currentPath && !isNaN(validX) && !isNaN(validY)) {
                            // Crea una nuova copia del path con il punto aggiunto
                            const updatedPath = {
                                ...currentPath,
                                points: [...currentPath.points, { x: validX, y: validY }]
                            };
                            
                            // Aggiorna il ref con il nuovo path
                            currentDrawPathRef.current = updatedPath;
                            
                            // Aggiorna l'ultimo path nella lista con una copia immutabile
                            setDrawings(prev => {
                                const updated = [...prev];
                                const lastIdx = updated.length - 1;
                                // Usa l'ID catturato invece del ref
                                if (lastIdx >= 0 && updated[lastIdx] && updated[lastIdx].id === currentPath.id) {
                                    updated[lastIdx] = updatedPath;
                                } else if (lastIdx < 0) {
                                    // Se non c'è ancora nessun path, aggiungilo
                                    updated.push(updatedPath);
                                }
                                return updated;
                            });
                        }
                    }
                 }}
                 onMouseUp={() => {
                     if (isSelectingArea) {
                         setIsSelectingArea(false);
                         areaSelectionStartRef.current = null;
                     } else if (isDrawingRef.current) {
                         isDrawingRef.current = false;
                         currentDrawPathRef.current = null;
                     }
                 }}
             >
                 {/* Header Workspace - JARVIS Style (rimosso, ora è fuori dal workspace) */}
                 
                 {/* Hint Pointer Tool */}
                 {hintPointer && (
                     <HintPointerTool 
                         hintPointer={hintPointer}
                         onRemove={() => setHintPointer(null)}
                     />
                 )}
                 
                 {/* Area Selector Tool */}
                 {areaSelection && (
                     <AreaSelectorTool areaSelection={areaSelection} />
                 )}
                 
                 {/* Draw Tool */}
                 {drawings.length > 0 && (
                     <DrawTool drawings={drawings} workspaceRef={workspaceRef} />
                 )}
                 
                 {/* Tool AR attivo - renderizzato DENTRO il workspace ROI */}
                 {hasActiveTool && (
                     <div className="absolute inset-0 z-30" style={{ pointerEvents: 'none' }}>
                         <div style={{ pointerEvents: 'auto' }}>
                             <ArToolRegistry type={ui.ar_overlay.tool_active} content={ui.ar_overlay.tool_content} sidebarCollapsed={sidebarCollapsed} />
                         </div>
                     </div>
                 )}
                 
                 {/* Hint per strumenti didattici */}
                 {activeTool === 'hint' && !hintPointer && (
                     <div className={`absolute ${isMobile ? 'bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 bg-[#18181b]/90 backdrop-blur-md border border-[#6366F1]/50 ${isMobile ? 'rounded px-2 py-1' : 'rounded-lg px-4 py-2'} shadow-lg z-40 pointer-events-none`}>
                         <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white font-bold`}>Clicca per posizionare l'indicatore 👆</div>
                     </div>
                 )}
                 {activeTool === 'area' && !areaSelection && (
                     <div className={`absolute ${isMobile ? 'bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 bg-[#18181b]/90 backdrop-blur-md border border-[#6366F1]/50 ${isMobile ? 'rounded px-2 py-1' : 'rounded-lg px-4 py-2'} shadow-lg z-40 pointer-events-none`}>
                         <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white font-bold`}>Trascina per selezionare un'area ⬜</div>
                     </div>
                 )}
                 {activeTool === 'draw' && (
                     <div className={`absolute ${isMobile ? 'bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 bg-[#18181b]/90 backdrop-blur-md border border-[#6366F1]/50 ${isMobile ? 'rounded px-2 py-1' : 'rounded-lg px-4 py-2'} shadow-lg z-40 pointer-events-none`}>
                         <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white font-bold`}>Trascina per disegnare ✏️</div>
                     </div>
                 )}
                 
                 {/* Resize Handles (4 angoli) - JARVIS Style */}
                 {/* Top-Left */}
                 <div 
                     className="resize-handle absolute -top-2 -left-2 w-5 h-5 bg-gradient-to-br from-[#6366F1] to-[#4F46E5] border-2 border-white/90 rounded cursor-nwse-resize hover:scale-125 hover:rotate-45 transition-all duration-300 z-20 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                     style={{clipPath: 'polygon(0 0, 100% 0, 0 100%)', borderRadius: '0.375rem'}}
                     onMouseDown={roiStartResize('nw')}
                 />
                 {/* Top-Right */}
                 <div 
                     className="resize-handle absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-bl from-[#6366F1] to-[#4F46E5] border-2 border-white/90 rounded cursor-nesw-resize hover:scale-125 hover:-rotate-45 transition-all duration-300 z-20 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                     style={{clipPath: 'polygon(100% 0, 100% 100%, 0 0)', borderRadius: '0.375rem'}}
                     onMouseDown={roiStartResize('ne')}
                 />
                 {/* Bottom-Left */}
                 <div 
                     className="resize-handle absolute -bottom-2 -left-2 w-5 h-5 bg-gradient-to-tr from-[#6366F1] to-[#4F46E5] border-2 border-white/90 rounded cursor-nesw-resize hover:scale-125 hover:-rotate-45 transition-all duration-300 z-20 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                     style={{clipPath: 'polygon(0 0, 0 100%, 100% 100%)', borderRadius: '0.375rem'}}
                     onMouseDown={roiStartResize('sw')}
                 />
                 {/* Bottom-Right */}
                 <div 
                     className="resize-handle absolute -bottom-2 -right-2 w-5 h-5 bg-gradient-to-tl from-[#6366F1] to-[#4F46E5] border-2 border-white/90 rounded cursor-nwse-resize hover:scale-125 hover:rotate-45 transition-all duration-300 z-20 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                     style={{clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', borderRadius: '0.375rem'}}
                     onMouseDown={roiStartResize('se')}
                 />
                 </div>
             </div>
         )}

         {/* AR: DATI RILEVATI */}
         {ui.ar_overlay?.data_panel?.length > 0 && (
             <div className={`absolute ${isMobile ? 'top-12 left-2 right-2' : 'top-28 left-24'} bg-[#18181b]/80 backdrop-blur-md ${isMobile ? 'p-3 rounded-lg w-auto' : 'p-5 rounded-xl w-64'} border-l-4 border-[#6366F1] shadow-2xl animate-fade-in z-20`}>
                 <h3 className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-2`}>Dati Rilevati</h3>
                 <ul className={`${isMobile ? 'space-y-0.5' : 'space-y-1'}`}>
                     {ui.ar_overlay.data_panel.map((d,i)=>(
                         <li key={i} className={`${isMobile ? 'text-xs' : 'text-sm'} text-white flex gap-2 items-start`}>
                             <span className="text-indigo-400 mt-1">•</span> <span>{d}</span>
                         </li>
                     ))}
                 </ul>
             </div>
         )}

         {/* DOCK COMANDI - JARVIS Style */}
         <div className={`absolute ${isMobile ? 'bottom-4 left-2 right-2' : 'bottom-8'} flex gap-3 sm:gap-4 z-50 ${isMobile ? 'justify-center' : ''}`}>
             {/* Mic Button con Visualizer - JARVIS Style */}
             <button 
                onClick={() => isListening ? stopMicrophone() : startMicrophone()} 
                className={`jarvis-button ${isMobile ? 'h-14 w-14' : 'h-20 w-20'} rounded-2xl flex items-center justify-center relative overflow-hidden ${
                    isListening ? 'bg-gradient-to-br from-red-500/90 to-red-700/90 border-red-400/60 shadow-[0_0_40px_rgba(239,68,68,0.6)]' : 
                    isAiSpeaking ? 'bg-gradient-to-br from-green-500/90 to-green-700/90 border-green-400/60 shadow-[0_0_40px_rgba(34,197,94,0.6)]' :
                    'border-[#6366F1]/30'
                }`}
             >
                 {(isListening || isAiSpeaking) ? (
                     <div className="flex gap-1.5 h-6 sm:h-8 items-end">
                         <div className="w-1.5 sm:w-2 bg-white rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{height: Math.min(isMobile ? 20 : 32, audioLevels[0] || 8)}}></div>
                         <div className="w-1.5 sm:w-2 bg-white rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{height: Math.min(isMobile ? 24 : 40, audioLevels[1] || 12)}}></div>
                         <div className="w-1.5 sm:w-2 bg-white rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{height: Math.min(isMobile ? 20 : 32, audioLevels[2] || 8)}}></div>
                     </div>
                 ) : (
                     <span className={`${isMobile ? 'text-xl' : 'text-3xl'} jarvis-icon-glow`}>🎙️</span>
                 )}
             </button>
             {convaiReady && (
                 <div className={`flex items-center gap-2 px-2 py-1 rounded-lg bg-[#18181b]/90 border border-[#6366F1]/40 ${isMobile ? 'absolute bottom-16 left-1/2 -translate-x-1/2' : ''}`} title="Avatar Convai attivo">
                     <span className="text-[10px] font-semibold text-[#818CF8] uppercase tracking-wider">Lipsync</span>
                     {(isAiSpeaking || isListening) && (
                         <div className="flex gap-0.5 h-4 items-end">
                             <div className="w-1 bg-white/90 rounded-full transition-all duration-75" style={{ height: Math.min(16, (audioLevels[0] || 8) / 2) }} />
                             <div className="w-1 bg-white/90 rounded-full transition-all duration-75" style={{ height: Math.min(20, (audioLevels[1] || 12) / 2) }} />
                             <div className="w-1 bg-white/90 rounded-full transition-all duration-75" style={{ height: Math.min(16, (audioLevels[2] || 8) / 2) }} />
                         </div>
                     )}
                 </div>
             )}
             {convaiError && (
                 <span className="text-[10px] text-amber-400" title={convaiError}>Convai: err</span>
             )}
             
             {/* Pulsante OSSERVA: stessa pipeline della chat (handleSendMessage con messaggio fisso); defer per evitare interferenze dal click */}
             <button
                 type="button"
                 onClick={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   const msg = "Nell'immagine c'è testo/numeri scritti a mano. Prima scrivi esattamente ciò che leggi (es. 'Vedo: 15 + 27 = 33'), poi correggi eventuali errori e dai il feedback educativo.";
                   setTimeout(() => handleSendMessage(msg), 0);
                 }}
                 className={`jarvis-primary ${isMobile ? 'h-14 flex-1 px-4' : 'h-20 px-8'} rounded-2xl text-white font-bold flex items-center justify-center gap-3 text-sm sm:text-base relative overflow-hidden group`}
             >
                 <span className="relative z-10 flex items-center gap-3">
                     <svg className={`${isMobile ? 'w-5 h-5' : 'w-7 h-7'} jarvis-icon-glow`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                     </svg>
                     <span className={isMobile ? 'text-xs font-semibold tracking-wide' : 'text-base font-bold tracking-wide'}>OSSERVA</span>
                 </span>
                 {/* Effetto shine al hover */}
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
             </button>
         </div>
         
         {/* LOADING - JARVIS Style */}
         {isAnalyzing && (
             <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-40">
                 <div className="jarvis-button px-10 py-8 rounded-3xl border border-[#6366F1]/50 flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(99,102,241,0.5)] relative overflow-hidden">
                     <div className="jarvis-icon-glow">
                         <svg className="w-16 h-16 text-[#6366F1] animate-spin" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                     </div>
                     <span className="font-bold text-[#6366F1] uppercase tracking-[0.3em] text-sm jarvis-icon-glow">Analisi in corso</span>
                     <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#6366F1] to-transparent animate-pulse"></div>
                 </div>
             </div>
         )}
      </div>


      {/* === COL 3: CHAT - JARVIS Style === */}
      <div className={`
        jarvis-sidebar flex flex-col z-20 transition-all duration-300
        ${isMobile
          ? `fixed right-0 top-0 h-full transform transition-transform duration-300 ${
              rightSidebarOpen ? 'translate-x-0 w-[90vw] max-w-[350px]' : 'translate-x-full w-[90vw] max-w-[350px]'
            }`
          : `${sidebarCollapsed ? 'w-[60px]' : 'w-[350px]'}`
        }
      `}>
         <div className={`jarvis-sidebar-header ${isMobile ? 'p-4' : 'p-6'} flex items-center justify-between`}>
             {(!sidebarCollapsed || isMobile) ? (
                 <div className="relative flex items-center gap-2">
                     <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#6366F1] rounded-full animate-pulse"></div>
                     <h2 className={`font-bold bg-gradient-to-r from-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${isMobile ? 'text-base' : 'text-lg'} jarvis-icon-glow`}>
                       {hasAvatarMode && avatarDisplayData ? avatarDisplayData.name : 'D.A.I'}
                     </h2>
                 </div>
             ) : (
                 <div className="text-2xl bg-gradient-to-r from-[#6366F1] to-[#818CF8] bg-clip-text text-transparent jarvis-icon-glow">💬</div>
             )}
             {!isMobile && (
               <button
                   onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                   className="jarvis-button w-8 h-8 flex items-center justify-center rounded-lg jarvis-icon-glow"
                   title={sidebarCollapsed ? "Espandi chat" : "Collassa chat"}
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
         <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-[#09090b] via-[#121212] to-[#09090b]">
             {history.map((msg, i) => {
                // Parse pulsanti nella risposta AI (formato: [visualizza la frazione])
                const buttonRegex = /\[([^\]]+)\]/g;
                let text = msg.text;
                const buttons: Array<{ text: string; action: string }> = [];
                let match;
                
                while ((match = buttonRegex.exec(msg.text)) !== null) {
                    buttons.push({ text: match[1], action: match[1].toLowerCase() });
                    text = text.replace(match[0], '');
                }
                
                return (
                    <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div className={`max-w-[90%] ${msg.sender === 'user' ? '' : 'w-full'} relative`}>
                            {msg.sender === 'ai' && hasAvatarMode && avatarDisplayData && (
                              <p className="text-[10px] font-semibold text-[#818CF8] mb-1 pl-1">{avatarDisplayData.name}</p>
                            )}
                            {/* JARVIS Style Chat Bubble */}
                            <div className={`p-4 rounded-xl text-sm leading-relaxed relative ${
                                msg.sender === 'user' 
                                ? 'jarvis-chat-user text-white' 
                                : 'jarvis-chat-ai text-gray-100'
                            }`}>
                                <div className="relative z-10 whitespace-pre-wrap">{text.trim()}</div>
                            </div>
                            {/* Pulsanti azione (solo per messaggi AI) */}
                            {msg.sender === 'ai' && buttons.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {buttons.map((btn, btnIdx) => {
                                        const getToolType = (action: string): ToolType | null => {
                                            const lower = action.toLowerCase();
                                            if (lower.includes('frazione') || lower.includes('fraction')) return 'fraction_visual';
                                            if (lower.includes('numero') || lower.includes('number') || lower.includes('linea')) return 'number_line';
                                            if (lower.includes('grammatica') || lower.includes('analisi')) return 'grammar_analyzer';
                                            if (lower.includes('flashcard') || lower.includes('vocabolario')) return 'flashcard_viewer';
                                            if (lower.includes('mappa') || lower.includes('concettuale')) return 'concept_map';
                                            return null;
                                        };
                                        
                                        const toolType = getToolType(btn.action);
                                        
                                        return (
                                            <button
                                                key={btnIdx}
                                                onClick={() => {
                                                    if (toolType) {
                                                        // Attiva il tool con il contenuto della chat attuale
                                                        setUi(prev => ({
                                                            ...prev,
                                                            ar_overlay: {
                                                                ...prev.ar_overlay,
                                                                tool_active: toolType,
                                                                tool_content: prev.spoken_text || text
                                                            }
                                                        }));
                                                    }
                                                }}
                                                className="jarvis-button px-4 py-2.5 rounded-lg text-[#818CF8] text-xs font-bold transition-all hover:scale-105 border border-[#6366F1]/30 hover:border-[#6366F1]/60"
                                            >
                                                {btn.text}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                );
             })}
             <div ref={chatEndRef} />
         </div>

         <div className={`jarvis-objective-box ${isMobile ? 'p-3' : 'p-4'}`}>
             <div className={`${isMobile ? 'mb-3' : 'mb-4'}`}>
                 <div className="flex items-center gap-2 mb-2">
                     <div className="w-1.5 h-1.5 bg-[#6366F1] rounded-full animate-pulse"></div>
                     <span className={`text-[#818CF8] ${isMobile ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-[0.2em]`}>Domanda Guida</span>
                 </div>
                 <p className={`text-white font-semibold ${isMobile ? 'text-sm' : 'text-md'} leading-tight jarvis-icon-glow`}>{ui.sidebar?.card?.question}</p>
             </div>

             <form onSubmit={(e)=>{e.preventDefault(); handleSendMessage(inputText)}} className="flex gap-2">
                 <input 
                    value={inputText} 
                    onChange={(e)=>setInputText(e.target.value)} 
                    placeholder="Rispondi..." 
                    className={`jarvis-input flex-1 bg-[#09090b] text-white border-[#6366F1]/50 ${isMobile ? 'rounded-lg px-3 py-2 text-xs' : 'rounded-xl px-4 py-3 text-sm'} outline-none`}
                    style={{ 
                      backgroundColor: 'rgba(9, 9, 11, 0.98)',
                      background: 'rgba(9, 9, 11, 0.98)',
                      color: '#ffffff',
                      borderColor: 'rgba(99, 102, 241, 0.5)'
                    }}
                 />
                 <button type="submit" className={`jarvis-primary ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3'} ${isMobile ? 'rounded-lg' : 'rounded-xl'} font-bold`}>↑</button>
             </form>
             
             {ui.sidebar?.card?.hints?.length > 0 && (
                 <div className="mt-3 flex gap-2 justify-center">
                     {ui.sidebar.card.hints.map((h, i) => (
                         <button 
                            key={i} 
                            onClick={()=>{setActiveHint(i); alert(h)}} 
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
                            className={`w-12 h-6 rounded-full transition-colors ${
                                roiSnapEnabled ? 'bg-[#6366F1]' : 'bg-gray-600'
                            }`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                roiSnapEnabled ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                        </button>
                    </div>
                </div>
                
                {/* Video Source */}
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-white mb-2">Sorgente Video</h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {devices.map(d=>(
                            <button 
                                key={d.deviceId} 
                                onClick={()=>{setSelectedDeviceId(d.deviceId); setIsSettingsOpen(false)}} 
                                className={`w-full text-left p-3 rounded-lg text-sm transition ${selectedDeviceId === d.deviceId ? 'bg-[#6366F1] text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>
                
                <button onClick={()=>setIsSettingsOpen(false)} className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition font-bold">CHIUDI</button>
            </div>
        </div>
      )}

      {/* DAI Observation Panel */}
      <DAIObservationPanel 
        state={daiState}
        meaningfulEvents={meaningfulEvents}
        isVisible={daiState?.isActive || false}
        autoInterventionEnabled={autoInterventionEnabled}
        onToggleAutoIntervention={() => setAutoInterventionEnabled(!autoInterventionEnabled)}
        ttsEnabled={ttsEnabled}
        onToggleTTS={() => setTtsEnabled(!ttsEnabled)}
      />
    </div>
  );
}