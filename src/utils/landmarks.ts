import type { MarkerMap, Point } from "../types";
import { averagePoints } from "./geometry";
import { loadImage } from "./image";

type Landmark = { x: number; y: number; z?: number };

type FaceDetectionResult = {
  faceLandmarks?: Landmark[][];
};

export interface AutoSuggestResult {
  status: "success" | "no-face" | "error";
  suggestions: Partial<MarkerMap>;
  message: string;
}

type FaceLandmarkerLike = {
  detect(input: HTMLImageElement): FaceDetectionResult;
};

let faceLandmarkerPromise: Promise<FaceLandmarkerLike> | null = null;

const LEFT_IRIS_INDICES = [468, 469, 470, 471, 472];
const RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477];
const LEFT_EYE_FALLBACK = [33, 133, 159, 145];
const RIGHT_EYE_FALLBACK = [362, 263, 386, 374];

async function getFaceLandmarker(): Promise<FaceLandmarkerLike> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
      );
      return vision.FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        numFaces: 1
      }) as Promise<FaceLandmarkerLike>;
    })();
  }
  return faceLandmarkerPromise;
}

function toPoint(landmark: Landmark, width: number, height: number): Point {
  return { x: landmark.x * width, y: landmark.y * height };
}

function collectIndexedPoints(
  landmarks: Landmark[],
  indices: number[],
  width: number,
  height: number
): Point[] {
  return indices
    .map((index) => landmarks[index])
    .filter((landmark): landmark is Landmark => Boolean(landmark))
    .map((landmark) => toPoint(landmark, width, height));
}

function estimateCardCorners(
  landmarks: Landmark[],
  width: number,
  height: number
): { leftCard: Point; rightCard: Point } | null {
  if (landmarks.length === 0) {
    return null;
  }

  const points = landmarks.map((landmark) => toPoint(landmark, width, height));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const forehead = landmarks[10] ? toPoint(landmarks[10], width, height) : null;
  const centerX = forehead?.x ?? (minX + maxX) / 2;
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  const suggestedCardWidth = faceWidth * 0.7;
  const cardY = (forehead?.y ?? minY + faceHeight * 0.2) - faceHeight * 0.05;

  return {
    leftCard: { x: centerX - suggestedCardWidth / 2, y: cardY },
    rightCard: { x: centerX + suggestedCardWidth / 2, y: cardY }
  };
}

export async function autoSuggestMarkers(
  imageDataUrl: string,
  width: number,
  height: number
): Promise<AutoSuggestResult> {
  try {
    const image = await loadImage(imageDataUrl);
    const faceLandmarker = await getFaceLandmarker();
    const detection = faceLandmarker.detect(image);
    const landmarks = detection.faceLandmarks?.[0];

    if (!landmarks) {
      return {
        status: "no-face",
        suggestions: {},
        message: "No face found. Place markers manually."
      };
    }

    const leftIris = averagePoints(
      collectIndexedPoints(landmarks, LEFT_IRIS_INDICES, width, height)
    );
    const rightIris = averagePoints(
      collectIndexedPoints(landmarks, RIGHT_IRIS_INDICES, width, height)
    );

    const leftEyeFallback = averagePoints(
      collectIndexedPoints(landmarks, LEFT_EYE_FALLBACK, width, height)
    );
    const rightEyeFallback = averagePoints(
      collectIndexedPoints(landmarks, RIGHT_EYE_FALLBACK, width, height)
    );

    const cardCorners = estimateCardCorners(landmarks, width, height);

    const leftPupil = leftIris ?? leftEyeFallback;
    const rightPupil = rightIris ?? rightEyeFallback;

    if (!leftPupil || !rightPupil) {
      return {
        status: "no-face",
        suggestions: {},
        message: "Face found, but eyes were unclear. Please set pupils manually."
      };
    }

    const suggestions: Partial<MarkerMap> = {
      leftPupil,
      rightPupil
    };
    if (cardCorners) {
      suggestions.leftCard = cardCorners.leftCard;
      suggestions.rightCard = cardCorners.rightCard;
    }

    return {
      status: "success",
      suggestions,
      message: "Auto-suggested markers loaded. Fine-tune points for best accuracy."
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      suggestions: {},
      message: "Auto-detection unavailable on this device. Manual mode is still available."
    };
  }
}
