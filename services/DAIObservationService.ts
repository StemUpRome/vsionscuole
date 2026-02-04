/**
 * DAI Observation Service
 * Servizio per gestire l'osservazione live del processo di apprendimento
 */

import type {
  ObservableType,
  Observable,
  TransformationEvent,
  ObservationState,
  Transformation,
} from '../dai/types';
import type { DomainAdapter } from '../dai/adapters';
import type { MotionDetectionResult } from '../dai/live-vision';

// Local types for stabilization config (moved from old DAI types)
export interface StabilizationConfig {
  enabled: boolean;
  threshold: number;
  smoothingFactor: number;
  minChangeForUpdate: number;
}

// ==========================================
// 1. CONFIGURAZIONE
// ==========================================
const DEFAULT_STABILIZATION: StabilizationConfig = {
  enabled: true,
  threshold: 0.02,        // 2% di cambiamento per considerare movimento
  smoothingFactor: 0.7,   // 70% peso al valore precedente
  minChangeForUpdate: 0.01, // 1% minimo per aggiornare ROI
};

const OBSERVATION_INTERVAL = 2000; // Snapshot ogni 2 secondi
const MOTION_CHECK_INTERVAL = 500;  // Controllo movimento ogni 500ms

// ==========================================
// 2. DAI OBSERVATION SERVICE
// ==========================================
export class DAIObservationService {
  private observationState: ObservationState | null = null;
  private stabilizationConfig: StabilizationConfig = DEFAULT_STABILIZATION;
  private domainAdapters: DomainAdapter[] = [];
  private observationInterval: number | null = null;
  private motionCheckInterval: number | null = null;
  private lastFrameData: ImageData | null = null;
  private frameCanvas: HTMLCanvasElement | null = null;
  private frameContext: CanvasRenderingContext2D | null = null;

  // Callbacks
  private onStateChange?: (state: ObservationState) => void;
  private onTransformation?: (event: TransformationEvent) => void;
  private onMotionDetected?: (result: MotionDetectionResult) => void;

  constructor(config?: Partial<StabilizationConfig>) {
    if (config) {
      this.stabilizationConfig = { ...DEFAULT_STABILIZATION, ...config };
    }
    this.frameCanvas = document.createElement('canvas');
    this.frameContext = this.frameCanvas.getContext('2d', { willReadFrequently: true });
  }

  // ==========================================
  // 3. GESTIONE OSSERVAZIONE
  // ==========================================
  
  /**
   * Avvia una nuova sessione di osservazione
   */
  startObservation(
    roiBounds: { x: number; y: number; width: number; height: number },
    callbacks?: {
      onStateChange?: (state: ObservationState) => void;
      onTransformation?: (event: TransformationEvent) => void;
      onMotionDetected?: (result: MotionDetectionResult) => void;
    }
  ): string {
    const sessionId = `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.observationState = {
      sessionId,
      startTime: Date.now(),
      observables: new Map(),
      transformations: [],
      currentStep: 1,
      isActive: true,
      roiBounds,
      lastSnapshotTime: Date.now(),
      motionDetected: false,
    };

    this.onStateChange = callbacks?.onStateChange;
    this.onTransformation = callbacks?.onTransformation;
    this.onMotionDetected = callbacks?.onMotionDetected;

    // Avvia monitoraggio movimento
    this.startMotionDetection();

    // Avvia snapshots periodici
    this.startObservationInterval();

    return sessionId;
  }

  /**
   * Ferma l'osservazione corrente
   */
  stopObservation(): void {
    if (this.observationInterval) {
      clearInterval(this.observationInterval);
      this.observationInterval = null;
    }
    if (this.motionCheckInterval) {
      clearInterval(this.motionCheckInterval);
      this.motionCheckInterval = null;
    }
    if (this.observationState) {
      this.observationState.isActive = false;
      this.notifyStateChange();
    }
  }

  /**
   * Aggiorna i bounds del ROI
   */
  updateROIBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    if (!this.observationState) return;
    
    // Applica stabilizzazione se abilitata
    if (this.stabilizationConfig.enabled) {
      const smoothed = this.smoothROIBounds(bounds);
      this.observationState.roiBounds = smoothed;
    } else {
      this.observationState.roiBounds = bounds;
    }
    this.notifyStateChange();
  }

  // ==========================================
  // 4. MOTION DETECTION
  // ==========================================
  
  private startMotionDetection(): void {
    this.motionCheckInterval = window.setInterval(() => {
      this.checkMotion();
    }, MOTION_CHECK_INTERVAL);
  }

  private async checkMotion(): Promise<void> {
    if (!this.frameContext || !this.observationState) return;

    // Cattura frame corrente dal video
    const video = document.querySelector('video') as HTMLVideoElement;
    if (!video || video.readyState < 2) return;

    const roi = this.observationState.roiBounds;
    const canvas = this.frameCanvas!;
    
    // Dimensioni canvas basate sul video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Disegna solo la regione ROI
    this.frameContext.drawImage(
      video,
      0, 0, video.videoWidth, video.videoHeight,
      0, 0, canvas.width, canvas.height
    );

    const currentFrame = this.frameContext.getImageData(
      Math.floor(roi.x * canvas.width),
      Math.floor(roi.y * canvas.height),
      Math.floor(roi.width * canvas.width),
      Math.floor(roi.height * canvas.height)
    );

    if (!this.lastFrameData) {
      this.lastFrameData = currentFrame;
      return;
    }

    const motionResult = this.detectMotion(this.lastFrameData, currentFrame);
    
    if (motionResult.hasMotion) {
      this.observationState.motionDetected = true;
      this.onMotionDetected?.(motionResult);
    } else {
      this.observationState.motionDetected = false;
    }

    this.lastFrameData = currentFrame;
  }

  private detectMotion(
    frame1: ImageData,
    frame2: ImageData
  ): MotionDetectionResult {
    if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
      return { hasMotion: false, motionRegions: [], motionIntensity: 0 };
    }

    const threshold = this.stabilizationConfig.threshold * 255;
    const motionPixels: { x: number; y: number }[] = [];

    for (let i = 0; i < frame1.data.length; i += 4) {
      const diff = Math.abs(frame1.data[i] - frame2.data[i]) +
                   Math.abs(frame1.data[i + 1] - frame2.data[i + 1]) +
                   Math.abs(frame1.data[i + 2] - frame2.data[i + 2]);
      
      if (diff > threshold * 3) {
        const pixelIndex = i / 4;
        motionPixels.push({
          x: pixelIndex % frame1.width,
          y: Math.floor(pixelIndex / frame1.width),
        });
      }
    }

    const hasMotion = motionPixels.length > (frame1.width * frame1.height * 0.01); // 1% di pixel cambiati
    const motionIntensity = Math.min(motionPixels.length / (frame1.width * frame1.height), 1); // Normalize to 0-1

    // Calcola regioni di movimento (semplificato)
    const motionRegions = this.clusterMotionRegions(motionPixels, frame1.width, frame1.height);

    return {
      hasMotion,
      motionRegions,
      motionIntensity,
    };
  }

  private clusterMotionRegions(
    pixels: { x: number; y: number }[],
    width: number,
    height: number
  ): MotionDetectionResult['motionRegions'] {
    if (pixels.length === 0) return [];

    // Calcola bounding box semplice
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

  // ==========================================
  // 5. SNAPSHOTS E ANALISI
  // ==========================================
  
  private startObservationInterval(): void {
    this.observationInterval = window.setInterval(() => {
      this.takeSnapshot();
    }, OBSERVATION_INTERVAL);
  }

  private async takeSnapshot(): Promise<void> {
    if (!this.observationState || !this.observationState.isActive) return;

    // Qui andrebbe chiamata l'API per analizzare l'immagine
    // Per ora simuliamo con un mock
    const newObservables = await this.analyzeCurrentFrame();

    // Confronta con osservabili precedenti e rileva trasformazioni
    this.detectTransformations(newObservables);

    // Aggiorna stato
    this.observationState.observables = new Map(
      newObservables.map(obs => [obs.id, obs])
    );
    this.observationState.lastSnapshotTime = Date.now();
    this.notifyStateChange();
  }

  private async analyzeCurrentFrame(): Promise<Observable[]> {
    // Cattura frame dal video
    const video = document.querySelector('video') as HTMLVideoElement;
    if (!video || video.readyState < 2 || !this.observationState) return [];

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Disegna il video sul canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Estrai solo la regione ROI
    const roi = this.observationState.roiBounds;
    const roiCanvas = document.createElement('canvas');
    roiCanvas.width = Math.floor(roi.width * canvas.width);
    roiCanvas.height = Math.floor(roi.height * canvas.height);
    const roiCtx = roiCanvas.getContext('2d');
    if (!roiCtx) return [];

    roiCtx.drawImage(
      canvas,
      Math.floor(roi.x * canvas.width),
      Math.floor(roi.y * canvas.height),
      roiCanvas.width,
      roiCanvas.height,
      0, 0, roiCanvas.width, roiCanvas.height
    );

    // Converti in base64
    const imgBase64 = roiCanvas.toDataURL('image/jpeg', 0.8);

    try {
      // Chiama l'API del server per analisi OCR
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imgBase64,
          userQuestion: "cosa sto osservando?", // Per triggerare l'analisi
          history: [],
        }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      
      // Estrai osservabili dal risultato (se disponibile)
      // Per ora creiamo osservabili generici basati sul testo OCR
      const observables: Observable[] = [];
      
      if (data.extract?.ocr_text) {
        const ocrText = data.extract.ocr_text;
        
        // Prova a determinare il tipo di contenuto
        let observableType: ObservableType = 'unknown';
        
        // Pattern matching per determinare il tipo
        if (/\d+\s*[+\-×*÷/]\s*\d+/.test(ocrText) || /[=<>≤≥≠]/.test(ocrText)) {
          observableType = 'symbolic_expression';
        } else if (/\.\s*[A-Z]/.test(ocrText) || ocrText.includes('.')) {
          observableType = 'sentence';
        } else if (/\n/.test(ocrText) && ocrText.split('\n').length > 1) {
          observableType = 'list';
        } else if (ocrText.length > 100) {
          observableType = 'text_block';
        }

        // Crea osservabile
        observables.push({
          id: `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: observableType,
          content: ocrText,
          bounds: {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
          },
          confidence: 0.7,
          detectedAt: Date.now(),
          metadata: {
            taskType: data.extract?.task_type,
            subject: data.extract?.subject,
          },
        });
      }

      return observables;
    } catch (error) {
      console.error('[DAI] Error analyzing frame:', error);
      return [];
    }
  }

  private detectTransformations(newObservables: Observable[]): void {
    if (!this.observationState) return;

    const oldObservables = Array.from(this.observationState.observables.values());
    const oldIds = new Set(oldObservables.map(o => o.id));
    const newIds = new Set(newObservables.map(o => o.id));

    // Detect ADD
    newObservables.forEach(obs => {
      if (!oldIds.has(obs.id)) {
        this.recordTransformation({
          transformation: 'add',
          observableId: obs.id,
          observableType: obs.type,
          after: obs.content,
          position: obs.bounds,
        });
      }
    });

    // Detect REMOVE
    oldObservables.forEach(obs => {
      if (!newIds.has(obs.id)) {
        this.recordTransformation({
          transformation: 'remove',
          observableId: obs.id,
          observableType: obs.type,
          before: obs.content,
          position: obs.bounds,
        });
      }
    });

    // Detect REPLACE
    newObservables.forEach(newObs => {
      const oldObs = oldObservables.find(o => o.id === newObs.id);
      if (oldObs && oldObs.content !== newObs.content) {
        this.recordTransformation({
          transformation: 'replace',
          observableId: newObs.id,
          observableType: newObs.type,
          before: oldObs.content,
          after: newObs.content,
          position: newObs.bounds,
        });
      }
    });
  }

  private recordTransformation(data: {
    transformation: Transformation;
    observableId: string;
    observableType: ObservableType;
    before?: string;
    after?: string;
    position?: { x: number; y: number; width: number; height: number };
  }): void {
    if (!this.observationState) return;

    const event: TransformationEvent = {
      id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transformation: data.transformation,
      observableId: data.observableId,
      observableType: data.observableType,
      timestamp: Date.now(),
      before: data.before,
      after: data.after,
      position: data.position ? {
        x: data.position.x,
        y: data.position.y,
      } : undefined,
    };

    this.observationState.transformations.push(event);
    this.onTransformation?.(event);
    this.notifyStateChange();
  }

  // ==========================================
  // 6. STABILIZATION
  // ==========================================
  
  private smoothROIBounds(
    newBounds: { x: number; y: number; width: number; height: number }
  ): { x: number; y: number; width: number; height: number } {
    if (!this.observationState) return newBounds;

    const alpha = this.stabilizationConfig.smoothingFactor;
    const oldBounds = this.observationState.roiBounds;

    // Calcola differenza
    const dx = Math.abs(newBounds.x - oldBounds.x);
    const dy = Math.abs(newBounds.y - oldBounds.y);
    const dw = Math.abs(newBounds.width - oldBounds.width);
    const dh = Math.abs(newBounds.height - oldBounds.height);

    const totalChange = dx + dy + dw + dh;

    // Se il cambiamento è troppo piccolo, mantieni il valore precedente
    if (totalChange < this.stabilizationConfig.minChangeForUpdate) {
      return oldBounds;
    }

    // Applica smoothing EMA
    return {
      x: alpha * oldBounds.x + (1 - alpha) * newBounds.x,
      y: alpha * oldBounds.y + (1 - alpha) * newBounds.y,
      width: alpha * oldBounds.width + (1 - alpha) * newBounds.width,
      height: alpha * oldBounds.height + (1 - alpha) * newBounds.height,
    };
  }

  // ==========================================
  // 7. DOMAIN ADAPTERS
  // ==========================================
  
  registerDomainAdapter(adapter: DomainAdapter): void {
    this.domainAdapters.push(adapter);
  }

  getDomainAdapter(observable: Observable): DomainAdapter | null {
    return this.domainAdapters.find(adapter => adapter.canHandle(observable)) || null;
  }

  // ==========================================
  // 8. UTILITIES
  // ==========================================
  
  getCurrentState(): ObservationState | null {
    return this.observationState;
  }

  private notifyStateChange(): void {
    if (this.observationState && this.onStateChange) {
      this.onStateChange({ ...this.observationState });
    }
  }

  // Cleanup
  destroy(): void {
    this.stopObservation();
    this.frameCanvas = null;
    this.frameContext = null;
    this.observationState = null;
  }
}

// Singleton instance
export const daiObservationService = new DAIObservationService();

