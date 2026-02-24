import { useCallback, useEffect, useMemo, useState } from "react";
import { AnnotationCanvas } from "./components/AnnotationCanvas";
import { CameraCapture } from "./components/CameraCapture";
import { createDefaultMarkers } from "./constants";
import { useCamera } from "./hooks/useCamera";
import type { AppStep, CapturedPhoto, MarkerMap, SavedReading } from "./types";
import { downloadMeasurementPng } from "./utils/exportPng";
import { autoSuggestMarkers } from "./utils/landmarks";
import { calculatePd } from "./utils/measurement";
import { clearReadings, loadReadings, saveReading } from "./utils/storage";

type AutoState = "idle" | "loading" | "success" | "no-face" | "error";

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

function buildShareText(reading: SavedReading): string {
  return [
    `Estimated PD: ${reading.pdMm.toFixed(1)} mm`,
    `Confidence: ${(reading.confidence * 100).toFixed(0)}%`,
    `Timestamp: ${formatTimestamp(reading.savedAt)}`,
    "Generated in browser-only PD estimator."
  ].join("\n");
}

function createReadingId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function App() {
  const camera = useCamera();
  const [step, setStep] = useState<AppStep>("instructions");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [markers, setMarkers] = useState<MarkerMap | null>(null);
  const [autoState, setAutoState] = useState<AutoState>("idle");
  const [autoMessage, setAutoMessage] = useState<string>("");
  const [savingError, setSavingError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedReading[]>(() => loadReadings());
  const [latestReading, setLatestReading] = useState<SavedReading | null>(history[0] ?? null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  const measurement = useMemo(() => (markers ? calculatePd(markers) : null), [markers]);

  const startFlow = useCallback(() => {
    setStep("camera");
  }, []);

  useEffect(() => {
    if (step === "camera" && camera.status === "idle") {
      void camera.startCamera();
    }
  }, [step, camera.status, camera.startCamera]);

  const handleCapture = () => {
    const captured = camera.capturePhoto();
    if (!captured) {
      return;
    }
    camera.stopCamera();
    setPhoto(captured);
    setMarkers(createDefaultMarkers(captured.width, captured.height));
    setAutoMessage("");
    setAutoState("idle");
    setSavingError(null);
    setStep("annotate");
  };

  const runAutoDetect = useCallback(async () => {
    if (!photo) {
      return;
    }
    setAutoState("loading");
    const result = await autoSuggestMarkers(photo.dataUrl, photo.width, photo.height);
    setAutoState(result.status);
    setAutoMessage(result.message);

    if (result.status === "success") {
      setMarkers((current) => {
        if (!current) {
          return current;
        }
        const next = { ...current };
        (Object.keys(result.suggestions) as (keyof MarkerMap)[]).forEach((key) => {
          const suggestion = result.suggestions[key];
          if (suggestion) {
            next[key] = suggestion;
          }
        });
        return next;
      });
    }
  }, [photo]);

  useEffect(() => {
    if (step !== "annotate" || !photo || !markers || autoState !== "idle") {
      return;
    }
    void runAutoDetect();
  }, [step, photo, markers, autoState, runAutoDetect]);

  const saveCurrentReading = () => {
    if (!photo || !markers || !measurement) {
      return;
    }
    if (!measurement.valid) {
      setSavingError("Fix highlighted issues before saving this measurement.");
      return;
    }
    setSavingError(null);
    const reading: SavedReading = {
      id: createReadingId(),
      savedAt: new Date().toISOString(),
      sourceCapturedAt: photo.capturedAt,
      pdMm: measurement.pdMmRounded,
      confidence: measurement.confidence,
      qualityMessage: measurement.qualityMessage,
      valid: measurement.valid,
      issues: measurement.issues,
      markers,
      pupilPixelDistance: measurement.pupilPixelDistance,
      cardPixelWidth: measurement.cardPixelWidth,
      mmPerPixel: measurement.mmPerPixel
    };
    const next = saveReading(reading);
    setHistory(next);
    setLatestReading(reading);
    setStep("result");
  };

  const clearHistory = () => {
    clearReadings();
    setHistory([]);
    setLatestReading(null);
  };

  const retakePhoto = () => {
    setPhoto(null);
    setMarkers(null);
    setAutoState("idle");
    setAutoMessage("");
    setSavingError(null);
    setStep("camera");
  };

  const downloadLatestAsPng = async () => {
    if (!photo || !markers || !measurement) {
      return;
    }
    try {
      setExportBusy(true);
      await downloadMeasurementPng(photo, markers, measurement);
    } catch (error) {
      console.error(error);
      setShareMessage("Could not export PNG on this browser.");
    } finally {
      setExportBusy(false);
    }
  };

  const shareLatest = async () => {
    const reading = latestReading;
    if (!reading) {
      return;
    }
    const text = buildShareText(reading);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "PD estimate",
          text
        });
        setShareMessage("Shared.");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareMessage("Summary copied to clipboard.");
      } else {
        setShareMessage(text);
      }
    } catch {
      setShareMessage("Sharing canceled.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-mist via-white to-slate-100 px-4 py-7 text-ink md:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="rounded-3xl bg-ink p-6 text-white shadow-card md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">IMVI LABS PD MEASURE</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">IMVI LABS Pupillary Distance Estimator</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
            Hybrid measurement: auto-suggest landmarks when available, then manually fine-tune
            four points for reliable PD scaling with a standard card (85.60 mm).
          </p>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <p className="rounded-xl bg-white/10 p-3">
              <span className="font-semibold text-cyan">Privacy:</span> all processing stays in
              this browser.
            </p>
            <p className="rounded-xl bg-white/10 p-3">
              <span className="font-semibold text-cyan">Calibration:</span> card width sets
              millimeter scale.
            </p>
            <p className="rounded-xl bg-white/10 p-3">
              <span className="font-semibold text-cyan">Disclaimer:</span> estimation tool, not a
              medical device.
            </p>
          </div>
        </header>

        <section className="rounded-3xl bg-white p-5 shadow-card md:p-7">
          <ol className="grid gap-3 text-sm md:grid-cols-4">
            {[
              { id: "instructions", label: "Instructions" },
              { id: "camera", label: "Capture" },
              { id: "annotate", label: "Adjust markers" },
              { id: "result", label: "Result" }
            ].map((item, index) => {
              const active = step === item.id;
              return (
                <li
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    active ? "border-cyan bg-cyan/10 font-semibold text-ink" : "border-slate-200"
                  }`}
                >
                  {index + 1}. {item.label}
                </li>
              );
            })}
          </ol>
        </section>

        {step === "instructions" && (
          <section className="rounded-3xl bg-white p-6 shadow-card md:p-8">
            <h2 className="text-2xl font-bold">How to capture reliable PD</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 md:text-base">
              <li>Use a standard payment card (width 85.60 mm), not a business card.</li>
              <li>Place the card flat on your forehead or upper face with both corners visible.</li>
              <li>Look straight at camera. Do not tilt head or card.</li>
              <li>Capture a still image, then drag each marker onto exact centers/corners.</li>
              <li>Save multiple readings and compare values for consistency.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startFlow}
                className="rounded-xl bg-cyan px-4 py-2 font-semibold text-white transition hover:brightness-95"
              >
                Start measurement
              </button>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStep("result")}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View saved readings ({history.length})
                </button>
              )}
            </div>
          </section>
        )}

        {step === "camera" && (
          <CameraCapture
            videoRef={camera.videoRef}
            status={camera.status}
            error={camera.error}
            onStart={() => void camera.startCamera()}
            onCapture={handleCapture}
            onCancel={() => {
              camera.stopCamera();
              setStep("instructions");
            }}
          />
        )}

        {step === "annotate" && photo && markers && measurement && (
          <section className="rounded-3xl bg-white p-5 shadow-card md:p-8">
            <h2 className="text-2xl font-bold text-ink">Step 2 - Check and adjust all markers</h2>
            <p className="mt-2 text-sm text-slate-700">
              Drag each point precisely. Pupils should be centered in each iris, and card points
              must sit exactly on the two visible card corners.
            </p>

            <div className="mt-4">
              <AnnotationCanvas photo={photo} markers={markers} onMarkersChange={setMarkers} />
            </div>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <p
                className={`rounded-xl p-3 ${
                  autoState === "error" || autoState === "no-face"
                    ? "bg-amber-50 text-amber-800"
                    : autoState === "success"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {autoState === "loading" ? "Running face landmarks..." : autoMessage || "Manual mode ready."}
              </p>
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="font-semibold">Estimated PD: {measurement.pdMmRounded.toFixed(1)} mm</p>
                <p>Confidence: {(measurement.confidence * 100).toFixed(0)}%</p>
                <p className="text-slate-600">{measurement.qualityMessage}</p>
              </div>
            </div>

            {measurement.issues.length > 0 && (
              <ul className="mt-3 space-y-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {measurement.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}

            {savingError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{savingError}</p>}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runAutoDetect()}
                className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Re-run auto-suggest
              </button>
              <button
                type="button"
                onClick={saveCurrentReading}
                className="rounded-xl bg-ink px-4 py-2 font-semibold text-white transition hover:brightness-95"
              >
                Save reading
              </button>
              <button
                type="button"
                onClick={() => void downloadLatestAsPng()}
                disabled={exportBusy}
                className="rounded-xl bg-ember px-4 py-2 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-amber-300"
              >
                {exportBusy ? "Exporting..." : "Download PNG"}
              </button>
              <button
                type="button"
                onClick={retakePhoto}
                className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Retake photo
              </button>
            </div>
          </section>
        )}

        {step === "result" && (
          <section className="rounded-3xl bg-white p-5 shadow-card md:p-8">
            <h2 className="text-2xl font-bold">Saved readings</h2>
            {latestReading && (
              <div className="mt-4 rounded-2xl border border-leaf/30 bg-leaf/10 p-4">
                <p className="text-sm font-semibold uppercase tracking-wider text-leaf">Latest saved result</p>
                <p className="mt-2 text-3xl font-bold text-ink">{latestReading.pdMm.toFixed(1)} mm</p>
                <p className="text-sm text-slate-700">
                  {latestReading.qualityMessage} | Confidence{" "}
                  {(latestReading.confidence * 100).toFixed(0)}%
                </p>
                <p className="mt-1 text-xs text-slate-600">Saved: {formatTimestamp(latestReading.savedAt)}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startFlow}
                className="rounded-xl bg-cyan px-4 py-2 font-semibold text-white transition hover:brightness-95"
              >
                New capture
              </button>
              <button
                type="button"
                onClick={() => void shareLatest()}
                disabled={!latestReading}
                className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Share summary
              </button>
              <button
                type="button"
                onClick={clearHistory}
                disabled={history.length === 0}
                className="rounded-xl border border-rose-300 px-4 py-2 font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear history
              </button>
            </div>

            {shareMessage && <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{shareMessage}</p>}

            <div className="mt-6 space-y-3">
              {history.length === 0 && <p className="text-sm text-slate-600">No saved readings yet.</p>}
              {history.map((reading) => (
                <article key={reading.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-ink">{reading.pdMm.toFixed(1)} mm</p>
                  <p className="text-sm text-slate-700">
                    Confidence {(reading.confidence * 100).toFixed(0)}% | {reading.qualityMessage}
                  </p>
                  <p className="text-xs text-slate-600">Saved {formatTimestamp(reading.savedAt)}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
