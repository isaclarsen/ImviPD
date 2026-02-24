export type AppStep = "instructions" | "camera" | "annotate" | "result";

export type MarkerKey = "leftPupil" | "rightPupil" | "leftCard" | "rightCard";

export interface Point {
  x: number;
  y: number;
}

export type MarkerMap = Record<MarkerKey, Point>;

export interface CapturedPhoto {
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: string;
}

export interface MeasurementResult {
  pupilPixelDistance: number;
  cardPixelWidth: number;
  mmPerPixel: number;
  pdMm: number;
  pdMmRounded: number;
  confidence: number;
  qualityMessage: string;
  issues: string[];
  valid: boolean;
}

export interface SavedReading {
  id: string;
  savedAt: string;
  sourceCapturedAt: string;
  pdMm: number;
  confidence: number;
  qualityMessage: string;
  valid: boolean;
  issues: string[];
  markers: MarkerMap;
  pupilPixelDistance: number;
  cardPixelWidth: number;
  mmPerPixel: number;
}
