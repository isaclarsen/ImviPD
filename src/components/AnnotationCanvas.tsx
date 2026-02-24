import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { MARKER_COLORS, MARKER_LABELS } from "../constants";
import type { CapturedPhoto, MarkerKey, MarkerMap, Point } from "../types";
import { clamp, distance } from "../utils/geometry";

interface AnnotationCanvasProps {
  photo: CapturedPhoto;
  markers: MarkerMap;
  onMarkersChange: (next: MarkerMap) => void;
}

function nearestMarker(point: Point, candidates: MarkerMap): MarkerKey | null {
  let nearest: MarkerKey | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  (Object.keys(candidates) as MarkerKey[]).forEach((key) => {
    const currentDistance = distance(point, candidates[key]);
    if (currentDistance < nearestDistance) {
      nearestDistance = currentDistance;
      nearest = key;
    }
  });

  return nearestDistance < 26 ? nearest : null;
}

export function AnnotationCanvas({ photo, markers, onMarkersChange }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const markersRef = useRef(markers);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeMarker, setActiveMarker] = useState<MarkerKey | null>(null);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    let mounted = true;
    const image = new Image();
    image.onload = () => {
      if (mounted) {
        imageRef.current = image;
      }
    };
    image.src = photo.dataUrl;

    return () => {
      mounted = false;
    };
  }, [photo.dataUrl]);

  useEffect(() => {
    if (!frameRef.current) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setSize({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, []);

  const scale = useMemo(
    () => ({
      x: size.width / photo.width,
      y: size.height / photo.height
    }),
    [size.height, size.width, photo.height, photo.width]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || size.width === 0 || size.height === 0) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    context.clearRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);

    const toCanvas = (point: Point): Point => ({ x: point.x * scale.x, y: point.y * scale.y });

    const leftCard = toCanvas(markers.leftCard);
    const rightCard = toCanvas(markers.rightCard);
    const leftPupil = toCanvas(markers.leftPupil);
    const rightPupil = toCanvas(markers.rightPupil);

    context.strokeStyle = "#fb923c";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(leftCard.x, leftCard.y);
    context.lineTo(rightCard.x, rightCard.y);
    context.stroke();

    context.strokeStyle = "#22d3ee";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(leftPupil.x, leftPupil.y);
    context.lineTo(rightPupil.x, rightPupil.y);
    context.stroke();

    (Object.keys(markers) as MarkerKey[]).forEach((key) => {
      const point = toCanvas(markers[key]);
      context.fillStyle = MARKER_COLORS[key];
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(point.x, point.y, 8, 0, Math.PI * 2);
      context.fill();
      context.stroke();

      context.fillStyle = "#101426";
      context.font = "600 13px 'Space Grotesk', sans-serif";
      context.fillText(MARKER_LABELS[key], point.x + 10, point.y - 10);
    });
  }, [markers, scale.x, scale.y, size.height, size.width]);

  const getImagePointFromEvent = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    // Pointer events arrive in displayed CSS pixels. Markers are stored in original image pixels.
    return {
      x: clamp(pointerX / Math.max(scale.x, 0.0001), 0, photo.width),
      y: clamp(pointerY / Math.max(scale.y, 0.0001), 0, photo.height)
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const hitPoint = getImagePointFromEvent(event);
    const key = nearestMarker(hitPoint, markersRef.current);
    if (!key) {
      return;
    }
    setActiveMarker(key);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!activeMarker) {
      return;
    }
    event.preventDefault();
    const nextPoint = getImagePointFromEvent(event);
    onMarkersChange({
      ...markersRef.current,
      [activeMarker]: nextPoint
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activeMarker) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setActiveMarker(null);
    }
  };

  return (
    <div
      ref={frameRef}
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}
