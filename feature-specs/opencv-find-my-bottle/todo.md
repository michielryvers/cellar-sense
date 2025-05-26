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

- [ ] **I1.3 Smoke E2E migration**

  - [ ] Cypress: app boots with empty DB after migration
  - [ ] All existing behaviour unaffected

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

- [ ] **I3.2 Homography math**

  - [ ] Compute H from tag corners
  - [ ] Unit test with synthetic tag sets (< 5 px error)

- [x] **I3.3 Calibration UI**

  - [x] Modal `calibrate`
  - [x] Overlay rectangle + grid during calibration
  - [x] Button flow: _Calibrate rack_ → _Confirm_ / _Retake_

- [x] **I3.4 Persist rack**

  - [x] Snapshot canvas saved in `cellarVisionDefinition`
  - [x] DAO `saveRack` used

---

## I4 — Location Picker

- [ ] **I4.1 `<LocationPicker>` component**

  - [ ] Full‑screen calibration photo
  - [ ] Tap shows magnifier
  - [ ] Saves normalised `x,y` to wine

---

## I5 — AR Find Mode

- [ ] **I5.1 `ARGuidanceService`**

  - [ ] Given DetectedTags\[] + rack.H → returns pixel (x,y) of wine
  - [ ] Unit math test (≤ 4 px error)

- [ ] **I5.2 `<FindBottleView>`**

  - [ ] Camera feed overlay
  - [ ] Draw green circle at projected coords
  - [ ] Banner when markers < 3

- [ ] **I5.3 Cypress scenarios**

  - [ ] Video fixture cycles 4→2→1→0 markers; overlay rules validated

---

## I6 — WineDetail Integration

- [ ] **I6.1 UI buttons**

  - [ ] Add **Set Location** / **Find Bottle** buttons
  - [ ] Visibility logic per spec

- [ ] **I6.2 Component tests**

  - [ ] Visibility matrix covered

- [ ] **I6.3 E2E happy path**

  - [ ] End‑to‑end flow: calibrate → set location → find bottle

---

## I7 — Edge‑cases & Polish

- [ ] Markers < 3 banner copy & styling
- [ ] Camera permission denied fallback notice
- [ ] Rack deleted → hide **Find Bottle** gracefully
- [ ] UX copy review & localisation keys added
- [ ] QA sweep on low‑end device

---

## I8 — CI & Docs Finish

- [ ] GitHub Actions: install, lint, test, Cypress headless
- [ ] Fail pipeline on test/lint errors
- [ ] README: vision setup, troubleshooting, tag printing guide
- [ ] Release tag `v0.1.0`

---

## I9 — Refactor & Coverage Pass

- [ ] Run `pnpm test --coverage` → ≥ 85 % lines
- [ ] Eliminate TODO / FIXME comments in vision modules
- [ ] Lint & Prettier clean
- [ ] Commit: "refactor: code‑health pass"

---

**Done?** ⭐️ Celebrate with a 🍷 – you’ve just shipped AR “find my bottle”! 🍾
