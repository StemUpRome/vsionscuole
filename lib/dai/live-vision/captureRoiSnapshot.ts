/**
 * captureRoiSnapshot
 * Captures a snapshot of the ROI region from video
 */

export interface RoiSnapshot {
  imageData: ImageData;
  base64: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: number;
}

export interface CaptureRoiSnapshotOptions {
  video: HTMLVideoElement;
  roiBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  quality?: number; // 0-1, default 0.8
}

/**
 * Captures a snapshot of the ROI region from video
 */
export function captureRoiSnapshot(
  options: CaptureRoiSnapshotOptions
): RoiSnapshot | null {
  const { video, roiBounds, quality = 0.8 } = options;

  // Check video readiness
  if (video.readyState < 2) {
    console.warn('[DAI] Video not ready for snapshot');
    return null;
  }

  const videoWidth = video.videoWidth || video.clientWidth;
  const videoHeight = video.videoHeight || video.clientHeight;

  if (videoWidth === 0 || videoHeight === 0) {
    console.warn('[DAI] Invalid video dimensions');
    return null;
  }

  // Create canvas for ROI extraction
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) {
    console.warn('[DAI] Could not create canvas context');
    return null;
  }

  // Calculate ROI pixel coordinates
  const roiX = Math.floor(roiBounds.x * videoWidth);
  const roiY = Math.floor(roiBounds.y * videoHeight);
  const roiW = Math.floor(roiBounds.width * videoWidth);
  const roiH = Math.floor(roiBounds.height * videoHeight);

  // Set canvas size to ROI size
  canvas.width = roiW;
  canvas.height = roiH;

  // Draw video frame
  ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

  // Extract ROI region
  const imageData = ctx.getImageData(roiX, roiY, roiW, roiH);

  // Create a new canvas for base64 conversion
  const roiCanvas = document.createElement('canvas');
  roiCanvas.width = roiW;
  roiCanvas.height = roiH;
  const roiCtx = roiCanvas.getContext('2d');
  
  if (!roiCtx) {
    console.warn('[DAI] Could not create ROI canvas context');
    return null;
  }

  // Put image data on ROI canvas
  roiCtx.putImageData(imageData, 0, 0);

  // Convert to base64
  const base64 = roiCanvas.toDataURL('image/jpeg', quality);

  return {
    imageData,
    base64,
    bounds: {
      x: roiX,
      y: roiY,
      width: roiW,
      height: roiH,
    },
    timestamp: Date.now(),
  };
}
