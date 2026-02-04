/**
 * useStabilizationTrigger Hook
 * Triggers stabilization when ROI bounds change significantly
 */

import { useRef, useCallback, useEffect } from 'react';

export interface StabilizationConfig {
  enabled: boolean;
  threshold: number; // Minimum change to trigger stabilization (0-1)
  smoothingFactor: number; // EMA smoothing factor (0-1), default 0.7
  minChangeForUpdate: number; // Minimum change to update ROI (0-1)
}

export interface UseStabilizationTriggerOptions {
  enabled: boolean;
  config?: Partial<StabilizationConfig>;
  onStabilize?: (smoothedBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
}

/**
 * Hook for stabilizing ROI bounds using EMA smoothing
 */
export function useStabilizationTrigger(
  roiBounds: { x: number; y: number; width: number; height: number },
  options: UseStabilizationTriggerOptions
) {
  const {
    enabled,
    config = {},
    onStabilize,
  } = options;

  const {
    threshold = 0.02,
    smoothingFactor = 0.7,
    minChangeForUpdate = 0.01,
  } = config;

  const smoothedBoundsRef = useRef(roiBounds);
  const lastBoundsRef = useRef(roiBounds);

  /**
   * Apply EMA smoothing to bounds
   */
  const smoothBounds = useCallback((
    newBounds: { x: number; y: number; width: number; height: number }
  ): { x: number; y: number; width: number; height: number } => {
    const current = smoothedBoundsRef.current;
    const alpha = smoothingFactor;

    // Calculate change
    const dx = Math.abs(newBounds.x - current.x);
    const dy = Math.abs(newBounds.y - current.y);
    const dw = Math.abs(newBounds.width - current.width);
    const dh = Math.abs(newBounds.height - current.height);

    const totalChange = dx + dy + dw + dh;

    // If change is too small, keep previous value
    if (totalChange < minChangeForUpdate) {
      return current;
    }

    // Apply EMA smoothing
    const smoothed = {
      x: alpha * current.x + (1 - alpha) * newBounds.x,
      y: alpha * current.y + (1 - alpha) * newBounds.y,
      width: alpha * current.width + (1 - alpha) * newBounds.width,
      height: alpha * current.height + (1 - alpha) * newBounds.height,
    };

    smoothedBoundsRef.current = smoothed;
    return smoothed;
  }, [smoothingFactor, minChangeForUpdate]);

  /**
   * Check if bounds changed significantly
   */
  const hasSignificantChange = useCallback((
    before: { x: number; y: number; width: number; height: number },
    after: { x: number; y: number; width: number; height: number }
  ): boolean => {
    const dx = Math.abs(after.x - before.x);
    const dy = Math.abs(after.y - before.y);
    const dw = Math.abs(after.width - before.width);
    const dh = Math.abs(after.height - before.height);

    const maxChange = Math.max(dx, dy, dw, dh);
    return maxChange > threshold;
  }, [threshold]);

  // Stabilize when bounds change
  useEffect(() => {
    if (!enabled) {
      smoothedBoundsRef.current = roiBounds;
      lastBoundsRef.current = roiBounds;
      return;
    }

    // Check if change is significant
    if (hasSignificantChange(lastBoundsRef.current, roiBounds)) {
      const smoothed = smoothBounds(roiBounds);
      lastBoundsRef.current = smoothed;

      if (onStabilize) {
        onStabilize(smoothed);
      }
    } else {
      // Update reference even if not significant
      lastBoundsRef.current = roiBounds;
    }
  }, [enabled, roiBounds, hasSignificantChange, smoothBounds, onStabilize]);

  return {
    smoothedBounds: smoothedBoundsRef.current,
  };
}

