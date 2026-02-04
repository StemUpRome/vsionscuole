import React, { useState, useRef, useEffect } from 'react';
import './MathSolver.css';

interface MathComponentProps {
  rawText: string;
}

const MathSolverComponent: React.FC<MathComponentProps> = ({ rawText }) => {
  // --- LOGICA DRAG & RESIZE (Standard) ---
  const [position, setPosition] = useState({ x: 100, y: 150 });
  const [size, setSize] = useState({ w: 400, h: 350 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, startW: 0, startH: 0 });

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault(); setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, startW: size.w, startH: size.h };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging) setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (isResizing) {
         setSize({ 
           w: Math.max(300, resizeStartRef.current.startW + (e.clientX - resizeStartRef.current.x)), 
           h: Math.max(200, resizeStartRef.current.startH + (e.clientY - resizeStartRef.current.y)) 
         });
      }
    };
    const handleUp = () => { setIsDragging(false); setIsResizing(false); };
    if (isDragging || isResizing) { window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleUp); }
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging, isResizing]);


  // --- 🧠 PARSER INTELLIGENTE v2 ---
  const parseMath = (text: string) => {
    if (!text) return { equation: null, steps: [] };

    // Regex per trovare equazioni esplicite (es. "3x + 5 = 20")
    const equationRegex = /([0-9xXyY]+\s*[\+\-\*\/^]\s*)+[0-9xXyY]+\s*=\s*[0-9xXyY\.\-]+/;
    const match = text.match(equationRegex);
    
    // Se troviamo l'equazione, la salviamo. Altrimenti è null.
    let mainEquation = match ? match[0] : null;

    // Se non l'abbiamo trovata con la regex, cerchiamo righe corte con "=" come fallback
    if (!mainEquation) {
        const lines = text.split('\n');
        // Cerca una riga che ha "=" ed è più corta di 20 caratteri (probabilmente è una formula)
        const simpleEqLine = lines.find(l => l.includes('=') && l.length < 20 && !l.includes('passo'));
        if (simpleEqLine) mainEquation = simpleEqLine.trim();
    }

    // Pulizia Steps: Rimuoviamo l'equazione dal testo per non ripeterla
    let steps = text.split('\n')
        .map(line => line.trim())
        .filter(line => 
            line.length > 0 && 
            (!mainEquation || !line.includes(mainEquation)) // Se c'è equazione, non ripeterla negli step
        );

    // Se c'è solo testo discorsivo (nessun a capo), mettiamolo come unico step
    if (steps.length === 0 && text.trim().length > 0) {
        steps = [text];
    }

    return { equation: mainEquation, steps };
  };

  const { equation, steps } = parseMath(rawText);

  return (
    <div className="math-card" style={{ left: position.x, top: position.y, width: size.w, height: size.h }}>
      <div className="math-header" onMouseDown={startDrag}>
        <h3>Risolutore Equazioni ⚡</h3>
      </div>

      <div className="math-body">
        
        {/* MOSTRA IL BOX GRANDE SOLO SE C'È UNA FORMULA REALE */}
        {equation && (
          <div className="equation-display">
            {equation}
          </div>
        )}

        {/* Lista Passaggi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {steps.map((step, idx) => (
            <div key={idx} className="step-item">
              <span className="step-number">Step {idx + 1}</span>
              <span className="step-text">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="resize-handle" onMouseDown={startResize} />
    </div>
  );
};

export default MathSolverComponent;