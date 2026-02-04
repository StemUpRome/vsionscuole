import React, { useState, useRef, useEffect } from 'react';
import './Timeline.css';

interface FractionVisualComponentProps {
  rawText: string;
  sidebarCollapsed?: boolean;
}

const FractionVisualComponent: React.FC<FractionVisualComponentProps> = ({ rawText, sidebarCollapsed = false }) => {
  // Carica posizione salvata o usa default intelligente
  const getInitialPosition = () => {
    const saved = localStorage.getItem('fraction_visual_position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { x: parsed.x || 100, y: parsed.y || 50, w: parsed.w || 500, h: parsed.h || 350 };
      } catch (e) {}
    }
    // Posizione iniziale: in alto a destra, non sovrapposta al workspace centrale
    return { x: window.innerWidth - 550, y: 50, w: 500, h: 350 };
  };

  const initial = getInitialPosition();
  const [position, setPosition] = useState({ x: initial.x, y: initial.y });
  const [size, setSize] = useState({ w: initial.w, h: initial.h });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, startW: 0, startH: 0 });
  const [fractions, setFractions] = useState<Array<{ numerator: number; denominator: number }>>([]);
  const hasInitializedRef = useRef(false);

  // Salva posizione quando cambia (debounced)
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      localStorage.setItem('fraction_visual_position', JSON.stringify({ x: position.x, y: position.y, w: size.w, h: size.h }));
    }, 500);
    return () => clearTimeout(timer);
  }, [position, size]);

  // Parse frazioni dal testo (es: "1/2", "3/4", "5 6" -> 5/6)
  useEffect(() => {
    if (!rawText) {
      setFractions([]);
      return;
    }

    const fractionRegex = /(\d+)\s*\/\s*(\d+)/g;
    const found: Array<{ numerator: number; denominator: number }> = [];
    let match;

    while ((match = fractionRegex.exec(rawText)) !== null) {
      const num = parseInt(match[1]);
      const den = parseInt(match[2]);
      if (den > 0 && den <= 12) { // Limita a denominatori ragionevoli per visualizzazione
        found.push({ numerator: num, denominator: den });
      }
    }

    setFractions(found.slice(0, 4)); // Massimo 4 frazioni
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
        // Limita il movimento dentro la finestra
        const newX = Math.max(0, Math.min(window.innerWidth - size.w, e.clientX - dragStartRef.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.h, e.clientY - dragStartRef.current.y));
        setPosition({ x: newX, y: newY });
      }
      if (isResizing) {
        const newW = Math.max(400, Math.min(window.innerWidth - position.x, resizeStartRef.current.startW + (e.clientX - resizeStartRef.current.x)));
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

  // Renderizza un cerchio diviso in frazioni
  const renderFractionCircle = (numerator: number, denominator: number, index: number) => {
    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    const anglePerSlice = (2 * Math.PI) / denominator;

    return (
      <div key={index} className="flex flex-col items-center" style={{ width: '200px' }}>
        {/* Cerchio SVG */}
        <svg width="200" height="200" style={{ marginBottom: '10px' }}>
          {Array.from({ length: denominator }, (_, i) => {
            const startAngle = i * anglePerSlice - Math.PI / 2;
            const endAngle = (i + 1) * anglePerSlice - Math.PI / 2;
            
            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const isFilled = i < numerator;
            const color = isFilled ? '#6366F1' : '#374151';
            
            const largeArcFlag = anglePerSlice > Math.PI ? 1 : 0;

            return (
              <path
                key={i}
                d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                fill={color}
                stroke="white"
                strokeWidth="2"
                opacity={isFilled ? 0.8 : 0.3}
              />
            );
          })}
          {/* Linee divisorie */}
          {Array.from({ length: denominator }, (_, i) => {
            const angle = i * anglePerSlice - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            return (
              <line
                key={`line-${i}`}
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        
        {/* Frazione come testo */}
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {numerator}
            <span className="text-gray-400">/{denominator}</span>
          </div>
          <div className="text-sm text-gray-400">
            {(numerator / denominator).toFixed(2)}
          </div>
        </div>
      </div>
    );
  };

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
          <span className="text-lg">🥧</span>
          <h3 className="text-sm font-bold">Frazioni Visuali</h3>
        </div>
      </div>

      <div className="jarvis-ar-body timeline-body" style={{ padding: '20px', height: 'calc(100% - 40px)', overflowY: 'auto' }}>
        {fractions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-4">🥧</div>
              <p>Nessuna frazione trovata nel testo.</p>
              <p className="text-xs mt-2">Prova con formati come: 1/2, 3/4, 5/6</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-8 justify-center items-start">
            {fractions.map((frac, idx) => renderFractionCircle(frac.numerator, frac.denominator, idx))}
          </div>
        )}
      </div>

      <div className="jarvis-ar-resize-handle resize-handle" onMouseDown={startResize} />
    </div>
  );
};

export default FractionVisualComponent;

