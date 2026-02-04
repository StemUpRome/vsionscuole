import React, { useState, useRef, useEffect } from 'react';
import './Timeline.css';

interface GrammarAnalyzerComponentProps {
  rawText: string;
  sidebarCollapsed?: boolean;
}

type PartOfSpeech = 'nome' | 'verbo' | 'aggettivo' | 'articolo' | 'preposizione' | 'avverbio' | 'pronome' | 'congiunzione';
type WordAnalysis = { word: string; pos: PartOfSpeech; detail?: string };

const POS_COLORS: Record<PartOfSpeech, string> = {
  nome: '#ef4444',        // Rosso
  verbo: '#3b82f6',       // Blu
  aggettivo: '#f59e0b',   // Arancione
  articolo: '#10b981',    // Verde
  preposizione: '#8b5cf6', // Viola
  avverbio: '#ec4899',    // Rosa
  pronome: '#06b6d4',     // Ciano
  congiunzione: '#84cc16' // Lime
};

const GrammarAnalyzerComponent: React.FC<GrammarAnalyzerComponentProps> = ({ rawText, sidebarCollapsed = false }) => {
  const getInitialPosition = () => {
    const saved = localStorage.getItem('grammar_analyzer_position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { x: parsed.x || 100, y: parsed.y || 50, w: parsed.w || 600, h: parsed.h || 400 };
      } catch (e) {}
    }
    return { x: window.innerWidth - 650, y: 50, w: 600, h: 400 };
  };

  const initial = getInitialPosition();
  const [position, setPosition] = useState({ x: initial.x, y: initial.y });
  const [size, setSize] = useState({ w: initial.w, h: initial.h });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, startW: 0, startH: 0 });
  const [analyzedWords, setAnalyzedWords] = useState<WordAnalysis[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordAnalysis | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      localStorage.setItem('grammar_analyzer_position', JSON.stringify({ x: position.x, y: position.y, w: size.w, h: size.h }));
    }, 500);
    return () => clearTimeout(timer);
  }, [position, size]);

  // Analisi grammaticale semplificata (pattern matching)
  useEffect(() => {
    if (!rawText) {
      setAnalyzedWords([]);
      return;
    }

    const words = rawText
      .replace(/[.,!?;:()]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0);

    const analysis: WordAnalysis[] = words.map(word => {
      const lower = word.toLowerCase();
      
      // Articoli
      if (['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una'].includes(lower)) {
        return { word, pos: 'articolo', detail: 'Articolo determinativo/indeterminativo' };
      }
      
      // Preposizioni
      if (['di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra'].includes(lower)) {
        return { word, pos: 'preposizione' };
      }
      
      // Congiunzioni
      if (['e', 'o', 'ma', 'però', 'perché', 'che', 'se', 'quando'].includes(lower)) {
        return { word, pos: 'congiunzione' };
      }
      
      // Pronomi comuni
      if (['io', 'tu', 'egli', 'ella', 'noi', 'voi', 'essi', 'esso', 'mi', 'ti', 'ci', 'vi'].includes(lower)) {
        return { word, pos: 'pronome', detail: 'Pronome personale' };
      }
      
      // Avverbi comuni (terminazione -mente)
      if (lower.endsWith('mente')) {
        return { word, pos: 'avverbio', detail: 'Avverbio di modo' };
      }
      
      // Pattern verbi (terminazioni comuni)
      if (lower.endsWith('are') || lower.endsWith('ere') || lower.endsWith('ire') || 
          lower.endsWith('ato') || lower.endsWith('ito') || lower.endsWith('uto') ||
          lower.endsWith('ando') || lower.endsWith('endo')) {
        return { word, pos: 'verbo', detail: 'Verbo' };
      }
      
      // Pattern aggettivi (terminazioni comuni)
      if (lower.endsWith('o') || lower.endsWith('a') || lower.endsWith('i') || lower.endsWith('e')) {
        // Se non è già classificato come altro, proviamo aggettivo
        // (in realtà servirebbe analisi più sofisticata)
        return { word, pos: 'aggettivo', detail: 'Possibile aggettivo' };
      }
      
      // Default: nome
      return { word, pos: 'nome', detail: 'Nome' };
    });

    setAnalyzedWords(analysis);
  }, [rawText]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, startW: size.w, startH: size.h };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.w, e.clientX - dragStartRef.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.h, e.clientY - dragStartRef.current.y));
        setPosition({ x: newX, y: newY });
      }
      if (isResizing) {
        const newW = Math.max(500, Math.min(window.innerWidth - position.x, resizeStartRef.current.startW + (e.clientX - resizeStartRef.current.x)));
        const newH = Math.max(300, Math.min(window.innerHeight - position.y, resizeStartRef.current.startH + (e.clientY - resizeStartRef.current.y)));
        setSize({ w: newW, h: newH });
      }
    };
    const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, size.w, size.h, position.x, position.y]);

  return (
    <div 
      className="jarvis-ar-tool timeline-card"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`, 
        width: `${size.w}px`, 
        height: `${size.h}px`,
        borderRadius: '1rem'
      }}
    >
      <div className="jarvis-ar-header timeline-header" onMouseDown={startDrag}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className="text-sm font-bold">Analisi Grammaticale</h3>
        </div>
      </div>

      <div className="jarvis-ar-body timeline-body" style={{ padding: '20px', height: 'calc(100% - 40px)', overflowY: 'auto' }}>
        {/* Testo analizzato con colori */}
        <div className="flex flex-wrap gap-2 mb-4" style={{ fontSize: '18px', lineHeight: '2' }}>
          {analyzedWords.map((item, idx) => (
            <span
              key={idx}
              className="px-2 py-1 rounded cursor-pointer transition-all hover:scale-110"
              style={{ 
                backgroundColor: `${POS_COLORS[item.pos]}40`,
                border: `2px solid ${POS_COLORS[item.pos]}`,
                color: POS_COLORS[item.pos]
              }}
              onClick={() => setSelectedWord(item)}
              title={`${item.pos}${item.detail ? ': ' + item.detail : ''}`}
            >
              {item.word}
            </span>
          ))}
        </div>

        {/* Dettaglio parola selezionata */}
        {selectedWord && (
          <div 
            className="p-4 rounded-lg border-2"
            style={{ 
              backgroundColor: `${POS_COLORS[selectedWord.pos]}20`,
              borderColor: POS_COLORS[selectedWord.pos]
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold" style={{ color: POS_COLORS[selectedWord.pos] }}>
                {selectedWord.word}
              </span>
              <span 
                className="px-3 py-1 rounded-full text-xs font-bold uppercase"
                style={{ 
                  backgroundColor: POS_COLORS[selectedWord.pos],
                  color: 'white'
                }}
              >
                {selectedWord.pos}
              </span>
            </div>
            {selectedWord.detail && (
              <p className="text-sm text-gray-300">{selectedWord.detail}</p>
            )}
          </div>
        )}

        {/* Legenda */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-gray-400 mb-2">Legenda:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(POS_COLORS).map(([pos, color]) => (
              <div key={pos} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-300 capitalize">{pos}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="jarvis-ar-resize-handle resize-handle" onMouseDown={startResize} />
    </div>
  );
};

export default GrammarAnalyzerComponent;

