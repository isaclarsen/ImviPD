import { useCallback, useEffect, useRef, useState } from "react";
import type { CapturedPhoto } from "../types";

export type CameraStatus = "idle" | "starting" | "ready" | "error";

function mapMediaError(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const { name } = error as { name: string };
    if (name === "NotAllowedError" || name === "SecurityError") {
      return "Camera permission denied. Enable camera access in browser settings.";
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      return "No compatible camera was found on this device.";
    }
  }
  return "Could not start camera. Check browser permissions and try again.";
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    releaseStream();
    setStatus("idle");
  }, [releaseStream]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Camera API not supported in this browser.");
      return;
    }

    setStatus("starting");
    setError(null);

    try {
      releaseStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setStatus("ready");
    } catch (cameraError) {
      setStatus("error");
      setError(mapMediaError(cameraError));
    }
  }, [releaseStream]);

  const capturePhoto = useCallback((): CapturedPhoto | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    // Keep the raw camera frame orientation so landmark coordinates match the pixel math.
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
      capturedAt: new Date().toISOString()
    };
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    status,
    error,
    startCamera,
    stopCamera,
    capturePhoto
  };
}
