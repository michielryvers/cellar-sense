# WineCellar Vision Feature – Todo Checklist

> Check each box as you complete the work.
> **Tip:** collapse completed iterations to stay focused.

---

## I1 — Storage Ready

- [x] **I1.1 Dexie schema migration v2**

  - [x] Create new table `cellarVisionDefinition`
  - [x] Extend `wines` store with optional `location { rackId, x, y }`
  - [x] Write migration code (idempotent)
  - [x] Update Dexie version constant
  - [x] Unit test: DB opens → schema contains new stores

- [x] **I1.2 DAO helpers**

  - [x] Implement `saveRack(def)`
  - [x] Implement `getRack(id)`
  - [x] Implement `saveWineLocation(wineId, loc)`
  - [x] Vitest: round‑trip persists objects correctly

---

## I2 — Detect Tags Prototype

- [x] **I2.1 Add OpenCV.js**

  - [x] Install OpenCV.js 4.10.0 as on‑demand module
  - [x] Lazy‑load in a Web Worker
  - [x] Verify bundle size unchanged in prod build

- [x] **I2.2 `detectTags` util**

  - [x] Create `vision/aruco.ts`
  - [x] Define `DetectedTag` type `{ id: number; corners: [x,y][] }`
  - [x] Implement detection logic
  - [x] Vitest: fixture `four_tags.png` → detects 4 IDs

- [x] **I2.3 Vue demo page**

  - [x] New route `/vision-debug` (DEV only)
  - [x] Shows live camera feed
  - [x] Displays count of detected tags

- [x] **I2.4 Tests**

  - [x] Component test: store updates reflect in DOM

---

## I3 — Rack Calibration

- [x] **I3.1 `CalibrationService` skeleton**

  - [x] API: `startCalibration(videoEl)` returns preview & H matrix
  - [x] Stops when 4 tags visible

- [x] **I3.2 Homography math**

  - [x] Compute H from tag corners
  - [x] Unit test with synthetic tag sets (< 5 px error)

- [x] **I3.3 Calibration UI**

  - [x] Modal `calibrate`
  - [x] Overlay rectangle + grid during calibration
  - [x] Button flow: _Calibrate rack_ → _Confirm_ / _Retake_

- [x] **I3.4 Persist rack**

  - [x] Snapshot canvas saved in `cellarVisionDefinition`
  - [x] DAO `saveRack` used

---

## I4 — Location Picker

- [x] **I4.1 `<LocationPicker>` component**

  - [x] Full‑screen calibration photo
  - [x] Tap shows magnifier
  - [x] Saves normalised `x,y` to wine

---

## I5 — AR Find Mode

- [x] **I5.1 `ARGuidanceService`**

  - [x] Given DetectedTags\[] + rack.H → returns pixel (x,y) of wine
  - [x] Unit math test (≤ 4 px error)

- [x] **I5.2 `<FindBottleView>`**

  - [x] Camera feed overlay
  - [x] Draw green circle at projected coords
  - [x] Banner when markers < 3

---

## I6 — WineDetail Integration

- [x] **I6.1 UI buttons**

  - [x] Add **Set Location** / **Find Bottle** buttons
  - [x] Visibility logic per spec

- [x] **I6.2 Component tests**

  - [x] Visibility matrix covered

---

## I7 — Edge‑cases & Polish

- [x] Markers < 3 banner copy & styling
- [x] Camera permission denied fallback notice
- [x] Rack deleted → hide **Find Bottle** gracefully
- [x] UX copy review & localisation keys added
- [x] QA sweep on low‑end device

---

**Done?** ⭐️ Celebrate with a 🍷 – you’ve just shipped AR “find my bottle”! 🍾
