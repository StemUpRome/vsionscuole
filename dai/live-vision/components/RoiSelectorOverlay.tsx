/**
 * RoiSelectorOverlay Component
 * Overlay for selecting and adjusting ROI bounds
 */

import React, { useRef, useState, useCallback } from 'react';

export interface RoiSelectorOverlayProps {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onBoundsChange: (bounds: { x: number; y: number; width: number; height: number }) => void;
  enabled: boolean;
  className?: string;
}

export function RoiSelectorOverlay({
  bounds,
  onBoundsChange,
  enabled,
  className = '',
}: RoiSelectorOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null); // 'nw' | 'ne' | 'sw' | 'se'
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, startW: 0, startH: 0 });

  if (!enabled) return null;

  const handleMouseDown = useCallback((e: React.MouseEvent, action: 'drag' | 'resize', handle?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const mouseX = (e.clientX - rect.left) / containerWidth;
    const mouseY = (e.clientY - rect.top) / containerHeight;

    if (action === 'drag') {
      setIsDragging(true);
      dragStartRef.current = {
        x: mouseX,
        y: mouseY,
        startX: bounds.x,
        startY: bounds.y,
        startW: bounds.width,
        startH: bounds.height,
      };
    } else if (action === 'resize' && handle) {
      setIsResizing(handle);
      dragStartRef.current = {
        x: mouseX,
        y: mouseY,
        startX: bounds.x,
        startY: bounds.y,
        startW: bounds.width,
        startH: bounds.height,
      };
    }
  }, [bounds]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const mouseX = (e.clientX - rect.left) / containerWidth;
    const mouseY = (e.clientY - rect.top) / containerHeight;

    const dx = mouseX - dragStartRef.current.x;
    const dy = mouseY - dragStartRef.current.y;

    if (isDragging) {
      const newX = Math.max(0, Math.min(1 - bounds.width, dragStartRef.current.startX + dx));
      const newY = Math.max(0, Math.min(1 - bounds.height, dragStartRef.current.startY + dy));

      onBoundsChange({
        x: newX,
        y: newY,
        width: bounds.width,
        height: bounds.height,
      });
    } else if (isResizing) {
      let newX = dragStartRef.current.startX;
      let newY = dragStartRef.current.startY;
      let newW = dragStartRef.current.startW;
      let newH = dragStartRef.current.startH;

      switch (isResizing) {
        case 'nw':
          newX = Math.max(0, dragStartRef.current.startX + dx);
          newY = Math.max(0, dragStartRef.current.startY + dy);
          newW = Math.max(0.1, dragStartRef.current.startW - dx);
          newH = Math.max(0.1, dragStartRef.current.startH - dy);
          break;
        case 'ne':
          newY = Math.max(0, dragStartRef.current.startY + dy);
          newW = Math.max(0.1, dragStartRef.current.startW + dx);
          newH = Math.max(0.1, dragStartRef.current.startH - dy);
          break;
        case 'sw':
          newX = Math.max(0, dragStartRef.current.startX + dx);
          newW = Math.max(0.1, dragStartRef.current.startW - dx);
          newH = Math.max(0.1, dragStartRef.current.startH + dy);
          break;
        case 'se':
          newW = Math.max(0.1, dragStartRef.current.startW + dx);
          newH = Math.max(0.1, dragStartRef.current.startH + dy);
          break;
      }

      // Ensure bounds stay within container
      if (newX + newW > 1) newW = 1 - newX;
      if (newY + newH > 1) newH = 1 - newY;

      onBoundsChange({
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    }
  }, [isDragging, isResizing, bounds, onBoundsChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  // Attach global mouse events
  React.useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const left = bounds.x * 100;
  const top = bounds.y * 100;
  const width = bounds.width * 100;
  const height = bounds.height * 100;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
    >
      {/* ROI Border */}
      <div
        className="absolute border-2 border-[#6366F1] bg-[#6366F1]/10 pointer-events-auto"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
      >
        {/* Resize Handles */}
        {['nw', 'ne', 'sw', 'se'].map((handle) => (
          <div
            key={handle}
            className={`
              absolute w-3 h-3 bg-[#6366F1] border-2 border-white rounded-full
              cursor-${handle}-resize
              hover:scale-125 transition-transform
            `}
            style={{
              [handle.includes('n') ? 'top' : 'bottom']: '-6px',
              [handle.includes('w') ? 'left' : 'right']: '-6px',
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown(e, 'resize', handle);
            }}
          />
        ))}

        {/* Corner Labels */}
        <div className="absolute -top-6 left-0 text-xs text-[#6366F1] font-mono bg-black/50 px-1 rounded">
          ROI
        </div>
      </div>
    </div>
  );
}

