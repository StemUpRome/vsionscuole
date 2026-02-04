/**
 * ROI Tightening
 * 
 * Calcola bounding box del contenuto utile dentro ROI per auto-tight
 */

export interface TextBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Stima bounding box del contenuto testuale da un canvas ROI
 * Trova i pixel scuri (testo) e calcola il bounding box
 */
export function estimateTextBboxFromCanvas(
  canvas: HTMLCanvasElement,
  roiBounds: { x: number; y: number; width: number; height: number }
): TextBbox | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const roiX = Math.floor(roiBounds.x * canvas.width);
  const roiY = Math.floor(roiBounds.y * canvas.height);
  const roiW = Math.floor(roiBounds.width * canvas.width);
  const roiH = Math.floor(roiBounds.height * canvas.height);

  // Estrai regione ROI
  const imageData = ctx.getImageData(roiX, roiY, roiW, roiH);
  const data = imageData.data;

  let minX = roiW;
  let minY = roiH;
  let maxX = 0;
  let maxY = 0;
  let foundDark = false;

  // Soglia per pixel "scuri" (testo)
  const DARK_THRESHOLD = 128;

  // Scansiona pixel per trovare bounding box del testo
  for (let y = 0; y < roiH; y++) {
    for (let x = 0; x < roiW; x++) {
      const idx = (y * roiW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;

      if (brightness < DARK_THRESHOLD) {
        foundDark = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!foundDark) {
    return null;
  }

  // Aggiungi padding (10% su ogni lato)
  const padding = Math.max(roiW, roiH) * 0.1;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(roiW, maxX + padding);
  maxY = Math.min(roiH, maxY + padding);

  // Converti in coordinate normalizzate (0-1) relative al canvas
  const bbox: TextBbox = {
    x: (roiX + minX) / canvas.width,
    y: (roiY + minY) / canvas.height,
    width: (maxX - minX) / canvas.width,
    height: (maxY - minY) / canvas.height,
  };

  return bbox;
}

/**
 * Determina se il ROI può essere stretto automaticamente
 */
export function shouldAutoTightROI(
  textBbox: TextBbox | null,
  currentRoi: { x: number; y: number; width: number; height: number },
  confidence: number
): { shouldTight: boolean; newBounds?: { x: number; y: number; width: number; height: number } } {
  if (!textBbox) {
    return { shouldTight: false };
  }

  const CONFIDENCE_THRESHOLD = 0.7;
  const AREA_RATIO_THRESHOLD = 0.55; // Se bbox è < 55% di ROI area

  if (confidence < CONFIDENCE_THRESHOLD) {
    return { shouldTight: false };
  }

  const roiArea = currentRoi.width * currentRoi.height;
  const bboxArea = textBbox.width * textBbox.height;
  const areaRatio = bboxArea / roiArea;

  if (areaRatio < AREA_RATIO_THRESHOLD && areaRatio > 0.1) {
    // Bbox significativamente più piccolo, propone auto-tight
    return {
      shouldTight: true,
      newBounds: {
        x: textBbox.x,
        y: textBbox.y,
        width: textBbox.width,
        height: textBbox.height,
      },
    };
  }

  return { shouldTight: false };
}

