import React, { useState, useRef, useEffect } from 'react';
import './Timeline.css';

interface TimelineComponentProps {
  rawText: string;
}

const TimelineComponent: React.FC<TimelineComponentProps> = ({ rawText }) => {
  // --- STATO POSIZIONE (X, Y) ---
  const [position, setPosition] = useState({ x: 100, y: 100 });
  // --- STATO DIMENSIONI (Width, Height) ---
  const [size, setSize] = useState({ w: 400, h: 450 });

  // Flags per sapere cosa stiamo facendo
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Riferimenti per calcolare i delta
  const dragStartRef = useRef({ x: 0, y: 0 }); // Dove ho cliccato per trascinare
  const resizeStartRef = useRef({ x: 0, y: 0, startW: 0, startH: 0 }); // Dove ho cliccato per ridimensionare

  // 1. INIZIO TRASCINAMENTO (Header)
  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Evita selezione testo
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  // 2. INIZIO RIDIMENSIONAMENTO (Angolo)
  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Evita che parta anche il drag se clicchi l'angolo
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startW: size.w,
      startH: size.h
    };
  };

  // 3. GESTIONE MOVIMENTO MOUSE (Globale)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // LOGICA DRAG
      if (isDragging) {
        const newX = e.clientX - dragStartRef.current.x;
        const newY = e.clientY - dragStartRef.current.y;
        setPosition({ x: newX, y: newY });
      }

      // LOGICA RESIZE
      if (isResizing) {
        // Calcola di quanto si è mosso il mouse rispetto all'inizio del resize
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;

        // Nuove dimensioni = Dimensione iniziale + Spostamento
        // Mettiamo un minimo (es. 300px) per non farlo sparire
        const newW = Math.max(300, resizeStartRef.current.startW + deltaX);
        const newH = Math.max(200, resizeStartRef.current.startH + deltaY);

        setSize({ w: newW, h: newH });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    // Attacchiamo i listener solo se stiamo facendo qualcosa
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  // --- PARSING EVENTI ---
  const parseEvents = (text: string) => {
    if (!text) return [];
    const parts = text.split(/\d+\.\s+/).filter(part => part.trim() !== "");
    return parts.map((part) => {
      const yearMatch = part.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[0] : "Data";
      const description = part.replace(year, "").replace(/^[\s-–]+/, "").trim();
      const title = description.split(" ").slice(0, 4).join(" ") + "...";
      return { year, title, description };
    });
  };
  const events = parseEvents(rawText);

  return (
    <div 
      className="jarvis-ar-tool timeline-card"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: `${size.w}px`,
        height: `${size.h}px`,
        maxWidth: 'none',
        borderRadius: '1rem'
      }}
    >
      {/* HEADER (Zona Drag) - JARVIS Style */}
      <div 
        className="jarvis-ar-header timeline-header"
        onMouseDown={startDrag}
        title="Trascina per spostare"
      >
        <h3 className="jarvis-icon-glow">Timeline Eventi ✥</h3>
      </div>
      
      <div className="jarvis-ar-body timeline-body">
        {events.length > 0 ? (
          events.map((ev, index) => (
            <div key={index} className="timeline-item">
              <div className="time-marker">
                <span className="year">{ev.year}</span>
                <div className="dot"></div>
              </div>
              <div className="content">
                <h4>{ev.title}</h4>
                <p>{ev.description}</p>
              </div>
            </div>
          ))
        ) : (
          <p style={{textAlign: 'center', opacity: 0.5}}>In attesa di dati...</p>
        )}
      </div>

      {/* MANIGLIA DI RESIZE (Zona Resize) - JARVIS Style */}
      <div 
        className="jarvis-ar-resize-handle resize-handle" 
        onMouseDown={startResize}
        title="Trascina per ridimensionare"
      />
    </div>
  );
};

export default TimelineComponent;