import { MARKER_COLORS, MARKER_LABELS } from "../constants";
import type { CapturedPhoto, MarkerKey, MarkerMap, MeasurementResult } from "../types";
import { loadImage } from "./image";

function drawMarker(
  ctx: CanvasRenderingContext2D,
  marker: MarkerKey,
  point: { x: number; y: number }
): void {
  ctx.fillStyle = MARKER_COLORS[marker];
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = "600 15px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "#101426";
  ctx.fillText(MARKER_LABELS[marker], point.x + 10, point.y - 10);
}

export async function downloadMeasurementPng(
  photo: CapturedPhoto,
  markers: MarkerMap,
  measurement: MeasurementResult
): Promise<void> {
  const image = await loadImage(photo.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height + 220;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas context.");
  }

  ctx.fillStyle = "#f0f6ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(image, 0, 0, image.width, image.height);

  ctx.strokeStyle = MARKER_COLORS.leftCard;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(markers.leftCard.x, markers.leftCard.y);
  ctx.lineTo(markers.rightCard.x, markers.rightCard.y);
  ctx.stroke();

  ctx.strokeStyle = MARKER_COLORS.leftPupil;
  ctx.beginPath();
  ctx.moveTo(markers.leftPupil.x, markers.leftPupil.y);
  ctx.lineTo(markers.rightPupil.x, markers.rightPupil.y);
  ctx.stroke();

  drawMarker(ctx, "leftPupil", markers.leftPupil);
  drawMarker(ctx, "rightPupil", markers.rightPupil);
  drawMarker(ctx, "leftCard", markers.leftCard);
  drawMarker(ctx, "rightCard", markers.rightCard);

  ctx.fillStyle = "#101426";
  ctx.font = "700 42px 'Space Grotesk', sans-serif";
  ctx.fillText(`Estimated PD: ${measurement.pdMmRounded.toFixed(1)} mm`, 36, image.height + 60);
  ctx.font = "500 24px 'Space Grotesk', sans-serif";
  ctx.fillText(
    `${new Date().toLocaleString()} | Confidence: ${(measurement.confidence * 100).toFixed(0)}%`,
    36,
    image.height + 102
  );
  ctx.fillText(measurement.qualityMessage, 36, image.height + 140);
  ctx.fillStyle = "#4b5563";
  ctx.font = "500 19px 'Space Grotesk', sans-serif";
  ctx.fillText(
    "Estimation tool only. Not a medical device. Verify with an eye care professional.",
    36,
    image.height + 184
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), "image/png")
  );

  if (!blob) {
    throw new Error("Unable to create PNG.");
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `pd-reading-${new Date().toISOString().replace(/:/g, "-")}.png`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
