import type { MarkerKey, MarkerMap } from "./types";

export const CARD_WIDTH_MM = 85.6;
export const MIN_CARD_PIXEL_WIDTH = 90;
export const MIN_PD_MM = 45;
export const MAX_PD_MM = 80;

export const STORAGE_KEY = "pdimvi-history-v1";

export const MARKER_LABELS: Record<MarkerKey, string> = {
  leftPupil: "Left pupil",
  rightPupil: "Right pupil",
  leftCard: "Card left corner",
  rightCard: "Card right corner"
};

export const MARKER_COLORS: Record<MarkerKey, string> = {
  leftPupil: "#22d3ee",
  rightPupil: "#22d3ee",
  leftCard: "#fb923c",
  rightCard: "#fb923c"
};

export function createDefaultMarkers(width: number, height: number): MarkerMap {
  return {
    leftPupil: { x: width * 0.4, y: height * 0.48 },
    rightPupil: { x: width * 0.6, y: height * 0.48 },
    leftCard: { x: width * 0.3, y: height * 0.2 },
    rightCard: { x: width * 0.7, y: height * 0.2 }
  };
}
