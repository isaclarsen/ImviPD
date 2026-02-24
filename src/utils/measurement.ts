import {
  CARD_WIDTH_MM,
  MAX_PD_MM,
  MIN_CARD_PIXEL_WIDTH,
  MIN_PD_MM
} from "../constants";
import type { MarkerMap, MeasurementResult } from "../types";
import { clamp, distance } from "./geometry";

export function calculatePd(markers: MarkerMap): MeasurementResult {
  const pupilPixelDistance = distance(markers.leftPupil, markers.rightPupil);
  const cardPixelWidth = distance(markers.leftCard, markers.rightCard);
  const mmPerPixel = cardPixelWidth > 0 ? CARD_WIDTH_MM / cardPixelWidth : 0;
  const pdMm = pupilPixelDistance * mmPerPixel;
  const pdMmRounded = Math.round(pdMm * 2) / 2;

  const issues: string[] = [];

  if (cardPixelWidth < MIN_CARD_PIXEL_WIDTH) {
    issues.push("Card markers are too close. Move card corner points to real card edges.");
  }

  if (pdMm < MIN_PD_MM || pdMm > MAX_PD_MM) {
    issues.push(`Estimated PD ${pdMm.toFixed(1)} mm is outside expected range (${MIN_PD_MM}-${MAX_PD_MM} mm).`);
  }

  const cardTiltRatio =
    Math.abs(markers.leftCard.y - markers.rightCard.y) / Math.max(cardPixelWidth, 1);
  if (cardTiltRatio > 0.2) {
    issues.push("Card line appears heavily tilted. Keep card parallel to camera for better scale.");
  }

  const scaleConfidence = clamp((cardPixelWidth - MIN_CARD_PIXEL_WIDTH) / 220, 0, 1);
  const tiltConfidence = 1 - clamp(cardTiltRatio / 0.2, 0, 1);
  let confidence = 0.35 + scaleConfidence * 0.45 + tiltConfidence * 0.2;

  if (pdMm < MIN_PD_MM || pdMm > MAX_PD_MM) {
    confidence -= 0.3;
  }

  confidence = clamp(confidence, 0, 1);

  let qualityMessage = "Low confidence - check marker placement and retake.";
  if (confidence >= 0.75 && issues.length === 0) {
    qualityMessage = "Good quality capture. Manual marker check still recommended.";
  } else if (confidence >= 0.5) {
    qualityMessage = "Moderate quality. Consider another capture to confirm.";
  }

  return {
    pupilPixelDistance,
    cardPixelWidth,
    mmPerPixel,
    pdMm,
    pdMmRounded,
    confidence,
    qualityMessage,
    issues,
    valid: issues.length === 0
  };
}
