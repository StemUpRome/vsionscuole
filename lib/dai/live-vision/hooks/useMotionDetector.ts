/**
 * useMotionDetector Hook
 * Cheap frame difference-based motion detection
 */

import { useRef, useCallback, useEffect } from 'react';

export interface MotionDetectionResult {
  hasMotion: boolean;
  motionIntensity: number; // 0-1
  motionRegions: {
    x: number;
    y: number;
    width: number;
    height: number;
    intensity: number;
  }[];
}

export interface UseMotionDetectorOptions {
  enabled: boolean;
  threshold?: number; // 0-1, default 0.02 (2% change)
  interval?: number; // ms, default 500
  roiBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Hook for detecting motion in video feed using cheap frame difference
 */
export function useMotionDetector(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseMotionDetectorOptions
) {
  const {
    enabled,
    threshold = 0.02,
    interval = 500,
    roiBounds,
  } = options;

  const lastFrameRef = useRef<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const onMotionDetectedRef = useRef<((result: MotionDetectionResult) => void) | null>(null);

  // Setup canvas for frame capture
  useEffect(() => {
    if (!enabled) {
      if (canvasRef.current) {
        canvasRef.current = null;
      }
      return;
    }

    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    return () => {
      canvasRef.current = null;
    };
  }, [enabled]);

  /**
   * Capture current frame from video
   */
  const captureFrame = useCallback((): ImageData | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState < 2) {
      return null;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Extract ROI region if specified
    if (roiBounds) {
      const roiX = Math.floor(roiBounds.x * canvas.width);
      const roiY = Math.floor(roiBounds.y * canvas.height);
      const roiW = Math.floor(roiBounds.width * canvas.width);
      const roiH = Math.floor(roiBounds.height * canvas.height);

      return ctx.getImageData(roiX, roiY, roiW, roiH);
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [videoRef, roiBounds]);

  /**
   * Compare two frames and detect motion
   */
  const detectMotion = useCallback((
    frame1: ImageData,
    frame2: ImageData
  ): MotionDetectionResult => {
    if (
      frame1.width !== frame2.width ||
      frame1.height !== frame2.height
    ) {
      return {
        hasMotion: false,
        motionIntensity: 0,
        motionRegions: [],
      };
    }

    const pixelThreshold = threshold * 255 * 3; // RGB channels
    const changedPixels: { x: number; y: number }[] = [];
    const width = frame1.width;
    const height = frame1.height;

    // Compare pixels
    for (let i = 0; i < frame1.data.length; i += 4) {
      const rDiff = Math.abs(frame1.data[i] - frame2.data[i]);
      const gDiff = Math.abs(frame1.data[i + 1] - frame2.data[i + 1]);
      const bDiff = Math.abs(frame1.data[i + 2] - frame2.data[i + 2]);
      const totalDiff = rDiff + gDiff + bDiff;

      if (totalDiff > pixelThreshold) {
        const pixelIndex = i / 4;
        changedPixels.push({
          x: pixelIndex % width,
          y: Math.floor(pixelIndex / width),
        });
      }
    }

    const totalPixels = width * height;
    const changedRatio = changedPixels.length / totalPixels;
    const hasMotion = changedRatio > threshold;

    // Cluster motion regions (simplified: single bounding box)
    const motionRegions = clusterMotionRegions(changedPixels, width, height);

    return {
      hasMotion,
      motionIntensity: changedRatio,
      motionRegions,
    };
  }, [threshold]);

  /**
   * Check for motion
   */
  const checkMotion = useCallback(() => {
    if (!enabled) return;

    const currentFrame = captureFrame();
    if (!currentFrame) return;

    if (!lastFrameRef.current) {
      lastFrameRef.current = currentFrame;
      return;
    }

    const result = detectMotion(lastFrameRef.current, currentFrame);
    lastFrameRef.current = currentFrame;

    if (onMotionDetectedRef.current) {
      onMotionDetectedRef.current(result);
    }
  }, [enabled, captureFrame, detectMotion]);

  // Start/stop motion detection interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      lastFrameRef.current = null;
      return;
    }

    intervalRef.current = window.setInterval(checkMotion, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, checkMotion]);

  /**
   * Set callback for motion detection
   */
  const onMotionDetected = useCallback((callback: (result: MotionDetectionResult) => void) => {
    onMotionDetectedRef.current = callback;
  }, []);

  return {
    checkMotion,
    onMotionDetected,
  };
}

/**
 * Cluster motion pixels into regions (simplified: single bounding box)
 */
function clusterMotionRegions(
  pixels: { x: number; y: number }[],
  width: number,
  height: number
): MotionDetectionResult['motionRegions'] {
  if (pixels.length === 0) return [];

  const minX = Math.min(...pixels.map(p => p.x));
  const maxX = Math.max(...pixels.map(p => p.x));
  const minY = Math.min(...pixels.map(p => p.y));
  const maxY = Math.max(...pixels.map(p => p.y));

  return [{
    x: minX / width,
    y: minY / height,
    width: (maxX - minX) / width,
    height: (maxY - minY) / height,
    intensity: pixels.length / (width * height),
  }];
}
