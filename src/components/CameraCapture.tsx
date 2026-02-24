import type { RefObject } from "react";
import type { CameraStatus } from "../hooks/useCamera";

interface CameraCaptureProps {
  videoRef: RefObject<HTMLVideoElement>;
  status: CameraStatus;
  error: string | null;
  onStart: () => void;
  onCapture: () => void;
  onCancel: () => void;
}

export function CameraCapture({
  videoRef,
  status,
  error,
  onStart,
  onCapture,
  onCancel
}: CameraCaptureProps) {
  return (
    <section className="rounded-3xl bg-white/95 p-5 shadow-card md:p-8">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Step 1 - Capture selfie with card</h2>
          <p className="mt-1 text-sm text-slate-600">
            Hold a standard card flat on your forehead, look straight at the lens, and keep the
            phone at arm&apos;s length.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="max-h-[60vh] w-full -scale-x-100 object-cover"
        />
        {status !== "ready" && (
          <div className="absolute inset-0 grid place-content-center bg-slate-950/75 text-center text-slate-100">
            <p className="text-base font-medium">
              {status === "starting" ? "Starting camera..." : "Camera preview will appear here."}
            </p>
          </div>
        )}
      </div>

      {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-cyan px-4 py-2 font-semibold text-white transition hover:brightness-95"
        >
          {status === "ready" ? "Restart camera" : "Enable camera"}
        </button>
        <button
          type="button"
          onClick={onCapture}
          disabled={status !== "ready"}
          className="rounded-xl bg-ink px-4 py-2 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Capture photo
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back
        </button>
      </div>
    </section>
  );
}
