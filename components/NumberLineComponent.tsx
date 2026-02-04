import React, { useState, useRef, useEffect } from 'react';
import './Timeline.css'; // Riutilizziamo gli stili per consistenza

interface NumberLineComponentProps {
  rawText: string;
  sidebarCollapsed?: boolean;
}

const NumberLineComponent: React.FC<NumberLineComponentProps> = ({ rawText, sidebarCollapsed = false }) => {
  // Carica posizione salvata o usa default intelligente
  const getInitialPosition = () => {
    const saved = localStorage.getItem('number_line_position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { x: parsed.x || 100, y: parsed.y || 50, w: parsed.w || 600, h: parsed.h || 180 };
      } catch (e) {}
    }
    // Posizione iniziale: in alto, non sovrapposta al workspace centrale
    return { x: window.innerWidth - 650, y: 50, w: 600, h: 180 };
  };

  const initial = getInitialPosition();
  const [position, setPosition] = useState({ x: initial.x, y: initial.y });
  const [size, setSize] = useState({ w: initial.w, h: initial.h });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, startW: 0, startH: 0 });
  const hasInitializedRef = useRef(false);

  // Stato linea numerica
  const [minValue, setMinValue] = useState(-10);
  const [maxValue, setMaxValue] = useState(10);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [marks, setMarks] = useState<Array<{ value: number; label?: string; color?: string }>>([]);

  // Salva posizione quando cambia (debounced)
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      localStorage.setItem('number_line_position', JSON.stringify({ x: position.x, y: position.y, w: size.w, h: size.h }));
    }, 500);
    return () => clearTimeout(timer);
  }, [position, size]);

  // Parse del testo per estrarre numeri o operazioni
  useEffect(() => {
    if (!rawText) return;
    
    // Cerca numeri nel testo
    const numberRegex = /-?\d+/g;
    const numbers = rawText.match(numberRegex)?.map(n => parseInt(n)) || [];
    
    if (numbers.length > 0) {
      const minNum = Math.min(...numbers);
      const maxNum = Math.max(...numbers);
      setMinValue(Math.min(minNum - 5, minValue));
      setMaxValue(Math.max(maxNum + 5, maxValue));
      setSelectedNumbers(numbers);
      
      // Crea marcatori per i numeri trovati
      setMarks(numbers.map(n => ({ value: n, label: n.toString(), color: '#6366F1' })));
    }
  }, [rawText]);

  // Drag & Resize handlers
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
        const newW = Math.max(300, Math.min(window.innerWidth - position.x, resizeStartRef.current.startW + (e.clientX - resizeStartRef.current.x)));
        const newH = Math.max(150, Math.min(window.innerHeight - position.y, resizeStartRef.current.startH + (e.clientY - resizeStartRef.current.y)));
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

  // Calcola posizione di un numero sulla linea
  const getPositionForValue = (value: number) => {
    const range = maxValue - minValue;
    const percentage = (value - minValue) / range;
    return percentage * 100;
  };

  // Gestione click sulla linea
  const handleLineClick = (e: React.MouseEvent<SVGLineElement>) => {
    const rect = e.currentTarget.closest('svg')?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const value = minValue + (percentage / 100) * (maxValue - minValue);
    const roundedValue = Math.round(value);
    
    setSelectedNumbers(prev => {
      if (prev.includes(roundedValue)) {
        return prev.filter(n => n !== roundedValue);
      }
      return [...prev, roundedValue];
    });
    
    // Aggiungi marcatore
    setMarks(prev => {
      if (prev.some(m => m.value === roundedValue)) {
        return prev.filter(m => m.value !== roundedValue);
      }
      return [...prev, { value: roundedValue, label: roundedValue.toString(), color: '#10b981' }];
    });
  };

  const range = maxValue - minValue;
  const step = range <= 20 ? 1 : range <= 50 ? 5 : 10;

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
      {/* Header draggable - JARVIS Style */}
      <div className="jarvis-ar-header timeline-header" onMouseDown={startDrag}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📏</span>
          <h3 className="text-sm font-bold">Linea dei Numeri</h3>
        </div>
        <div className="flex gap-2 items-center text-xs">
          <button 
            onClick={() => { setMinValue(minValue - 10); setMaxValue(maxValue - 10); }}
            className="jarvis-button px-2 py-1 rounded"
          >
            ←
          </button>
          <span className="text-gray-300 jarvis-icon-glow">{minValue} ... {maxValue}</span>
          <button 
            onClick={() => { setMinValue(minValue + 10); setMaxValue(maxValue + 10); }}
            className="jarvis-button px-2 py-1 rounded"
          >
            →
          </button>
        </div>
      </div>

      {/* Body - Linea numerica - JARVIS Style */}
      <div className="jarvis-ar-body timeline-body" style={{ padding: '20px', height: 'calc(100% - 40px)' }}>
        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* Linea principale */}
          <line
            x1="5%"
            y1="50%"
            x2="95%"
            y2="50%"
            stroke="#6366F1"
            strokeWidth="3"
            filter="drop-shadow(0 0 8px rgba(99, 102, 241, 0.8))"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
          />

          {/* Segni graduazione */}
          {Array.from({ length: Math.floor(range / step) + 1 }, (_, i) => {
            const value = minValue + i * step;
            const x = `${5 + getPositionForValue(value) * 0.9}%`;
            return (
              <g key={value}>
                {/* Lineetta */}
                <line
                  x1={x}
                  y1="45%"
                  x2={x}
                  y2="55%"
                  stroke="#9ca3af"
                  strokeWidth="2"
                />
                {/* Numero */}
                <text
                  x={x}
                  y="40%"
                  textAnchor="middle"
                  fill="#e5e7eb"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Zero */}
          {minValue <= 0 && maxValue >= 0 && (
            <g>
              <line
                x1={`${5 + getPositionForValue(0) * 0.9}%`}
                y1="35%"
                x2={`${5 + getPositionForValue(0) * 0.9}%`}
                y2="65%"
                stroke="#ef4444"
                strokeWidth="2"
              />
              <text
                x={`${5 + getPositionForValue(0) * 0.9}%`}
                y="30%"
                textAnchor="middle"
                fill="#ef4444"
                fontSize="14"
                fontWeight="bold"
              >
                0
              </text>
            </g>
          )}

          {/* Marcatori selezionati */}
          {marks.map((mark, idx) => {
            const x = `${5 + getPositionForValue(mark.value) * 0.9}%`;
            return (
              <g key={`${mark.value}-${idx}`}>
                {/* Cerchio */}
                <circle
                  cx={x}
                  cy="50%"
                  r="8"
                  fill={mark.color || '#6366F1'}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', filter: `drop-shadow(0 0 10px ${mark.color || '#6366F1'})` }}
                />
                {/* Label */}
                {mark.label && (
                  <text
                    x={x}
                    y="75%"
                    textAnchor="middle"
                    fill={mark.color || '#6366F1'}
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {mark.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Info pannello */}
        {selectedNumbers.length > 0 && (
          <div className="mt-2 p-2 bg-white/5 rounded text-xs">
            <div className="text-gray-400 mb-1">Numeri selezionati:</div>
            <div className="flex flex-wrap gap-2">
              {selectedNumbers.sort((a, b) => a - b).map(n => (
                <span key={n} className="px-2 py-1 bg-[#6366F1]/30 rounded">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resize handle - JARVIS Style */}
      <div 
        className="jarvis-ar-resize-handle resize-handle"
        onMouseDown={startResize}
      />
    </div>
  );
};

export default NumberLineComponent;

