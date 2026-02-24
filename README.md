# PD/IPD Browser MVP

One-page React + TypeScript web app that estimates pupillary distance (PD/IPD) in millimeters using a hybrid workflow:

- auto-suggested eye/card points from face landmarks
- manual marker correction on a captured selfie
- card-based scaling using a standard card width (85.60 mm)

All processing is done on-device in the browser.

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS
- Canvas overlay marker editor
- MediaPipe Face Landmarker (`@mediapipe/tasks-vision`)
- Frontend-only (no backend)

## Architecture and state model

`src/App.tsx` is the single-page orchestrator with step-based UI:

- `instructions` -> guidance, privacy/disclaimer
- `camera` -> `getUserMedia` preview + still capture
- `annotate` -> auto-suggest + manual marker editing + validation
- `result` -> saved history, share summary, retake

Core modules:

- `src/hooks/useCamera.ts`: camera lifecycle, capture, cleanup
- `src/components/AnnotationCanvas.tsx`: draggable markers and overlay lines
- `src/utils/landmarks.ts`: MediaPipe eye landmark auto-suggestions
- `src/utils/measurement.ts`: PD math + quality/validation checks
- `src/utils/storage.ts`: localStorage history
- `src/utils/exportPng.ts`: export measurement card PNG

Primary app state:

- `step: "instructions" | "camera" | "annotate" | "result"`
- `photo: CapturedPhoto | null`
- `markers: MarkerMap | null` (`leftPupil`, `rightPupil`, `leftCard`, `rightCard`)
- `measurement: MeasurementResult | null` (derived from markers)
- `history: SavedReading[]` (persisted in localStorage)
- `autoState`: landmark detection status (`idle/loading/success/no-face/error`)

## Measurement math

In `src/utils/measurement.ts`:

1. `pupilPixelDistance = distance(leftPupil, rightPupil)`
2. `cardPixelWidth = distance(leftCard, rightCard)` (Euclidean, robust to tilt)
3. `mmPerPixel = 85.60 / cardPixelWidth`
4. `pdMm = pupilPixelDistance * mmPerPixel`
5. Display rounded result to 0.5 mm: `Math.round(pdMm * 2) / 2`

Validation/quality guards:

- minimum card pixel width threshold (`MIN_CARD_PIXEL_WIDTH`)
- plausible PD range (`45-80 mm`)
- card tilt penalty based on vertical difference between card corners
- confidence score and quality message (good/moderate/low)

## Folder structure

```text
PDImvi/
  index.html
  package.json
  postcss.config.cjs
  tailwind.config.ts
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  src/
    App.tsx
    main.tsx
    index.css
    constants.ts
    types.ts
    components/
      CameraCapture.tsx
      AnnotationCanvas.tsx
    hooks/
      useCamera.ts
    utils/
      geometry.ts
      image.ts
      landmarks.ts
      measurement.ts
      storage.ts
      exportPng.ts
```

## Setup

```bash
npm install
npm run dev
```

Then open the local Vite URL (usually `http://localhost:5173`).

## MVP features checklist

- One-page, step-based UX
- Camera capture (`getUserMedia`)
- Still photo capture
- Card calibration guidance (85.60 mm reference)
- 4 draggable markers on canvas
- Auto-suggest pupils with manual override
- PD calculation in mm
- Result timestamp + confidence/quality feedback
- Local history storage
- PNG export
- Browser-only privacy note
- Medical disclaimer

## Limitations

- Not a medical device, only an estimate.
- Accuracy depends heavily on marker placement, frontal pose, and card visibility.
- Perspective distortion is not fully corrected in MVP (single 2-point scale).
- Front camera optics and image quality can affect repeatability.

## Phase 2 roadmap

1. Real-time face landmark preview before capture.
2. Stability score + auto-capture when pose/card is steady.
3. Real-time PD estimate during live preview.
4. Monocular PD (left/right) from nose midpoint and per-eye center.
5. Better perspective handling (e.g., homography from full card corners).
6. Multi-shot averaging workflow for tighter confidence intervals.
# ImviPD
