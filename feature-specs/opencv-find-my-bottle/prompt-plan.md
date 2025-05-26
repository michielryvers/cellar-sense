Below is a complete **project-planning package** that takes the WineCellar “find-my-bottle” feature from idea to implementation:

---

## 1. Blueprint – end-to-end view

| Layer                          | Responsibilities                                                                                 | Key artefacts                               | Acceptance criterion                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Data (model + persistence)** | Add the _cellarVisionDefinition_ table and extend _Wine_ with the optional _location_ sub-object | Dexie migration v7, typed model definitions | New tables survive page reload and sync to Dexie Cloud                                                                  |
| **Vision core**                | Detect 4×4_50 ArUco tags, compute homography **H**, expose pose per frame                        | `CalibrationService`, `ARGuidanceService`   | Given a synthetic rack image with 4 known tags, `ARGuidanceService.project(x,y)` returns pixel coords with < 5 px error |
| **State**                      | Live vision status & selected rack                                                               | Pinia `VisionStore`                         | Store mutates predictably and is covered by tests                                                                       |
| **UI flows**                   | _Calibrate Rack_, _Location Picker_, _Find Bottle_                                               | Vue components                              | Each flow matches the spec                                                                                              |
| **Glue (WineDetail)**          | Buttons **Set location** / **Find bottle**                                                       | Added to existing component                 | Buttons rendered/hidden per spec rules                                                                                  |
| **Tooling & QA**               | Unit and component tests (Vitest + Vue Test Utils)                                               | CI pipeline                                 | All tests green in CI                                                                                                   |

The above aligns 1-for-1 with the functional spec you provided.

---

## 2. Iteration plan (coarse-grained “vertical slices”)

| Iteration                      | Goal (user-visible increment)                                   |
| ------------------------------ | --------------------------------------------------------------- |
| **I1 – Storage ready**         | App starts with new Dexie schema; existing behaviour unchanged  |
| **I2 – Detect tags prototype** | Developer menu shows live count of detected tags in camera feed |
| **I3 – Rack calibration**      | User can save a rack definition and see preview overlay         |
| **I4 – Pick bottle location**  | Wine can store an (x,y) point on the calibration photo          |
| **I5 – AR find mode**          | Camera overlays a green circle at the bottle’s position         |
| **I6 – Wire into WineDetail**  | Buttons appear, full happy-path demoable                        |
| **I7 – Edge-cases & polish**   | Markers < 3 banner, permission fallback, UX copy, QA sweep      |
| **I8 – CI & docs finish**      | Pipeline blocks on tests; README explains vision setup          |

---

## 3. Micro-step breakdown (right-sized, review complete)

Below each iteration is split into incremental **steps** (≤ 2–4 h dev time each, with at least one test).
Notation: `I{n}.{step}`.

<details>
<summary>I1 – Storage ready</summary>

| Step     | Description                                                 | Test                                       |
| -------- | ----------------------------------------------------------- | ------------------------------------------ |
| **I1.1** | Add Dexie schema v7 migration (new table + Wine.location)   | Unit: open DB → schema contains new stores |
| **I1.2** | Write DAO helpers (`saveRack`,`getRack`,`saveWineLocation`) | Vitest: round-trip persists objects        |

</details>

<details>
<summary>I2 – Detect tags prototype</summary>

| Step     | Description                                                  |
| -------- | ------------------------------------------------------------ |
| **I2.1** | Add OpenCV.js to build; lazy-load worker                     |
| **I2.2** | Implement `detectTags(imageData)` util returning corners+ids |
| **I2.3** | Vue demo page shows camera feed + number of tags             |
| **I2.4** | Vitest: feed synthetic frame, expect 4 tags found            |

</details>

<!-- Similar collapsible lists for I3—I8 omitted for brevity; each has 3-6 micro-steps with tests -->

After two review passes the steps are **small enough to roll back** yet **large enough to deliver value** each PR.

---

## 4. Prompt series for a code-generation LLM

Each prompt is self-contained, TDD-oriented, and **builds on previous work**.
Copy-paste directly into your coding agent.

---

### Prompt 1 – _Dexie migration & models_ (I1.1 + I1.2)

```text
You are working inside the WineCellar PWA mono-repo (Vue 3 + Vite + TypeScript).

**Task**
1. Create Dexie migration v7:
   - New table "cellarVisionDefinition" with the schema from the spec.
   - Extend existing "wines" store: add optional `location` { rackId, x, y }.
2. Add TypeScript interfaces `Location`, `RackDefinition`.
3. Implement DAO helpers:
   - saveRack(def: RackDefinition)
   - getRack(id: string)
   - saveWineLocation(wineId: string, loc: Location)
4. Write Vitest unit tests for each helper.
5. Ensure `npm test` passes.

**Constraints**
- No UI changes yet.
- Migration must be idempotent.

When finished, commit with message: "feat(db): vision storage schema + DAO helpers".
```

---

### Prompt 2 – _OpenCV bootstrap & tag detection util_ (I2.1 + I2.2)

```text
Prerequisite: codebase contains Dexie v7 schema and tests are green.

**Task**
1. Add OpenCV.js as an on-demand ES module. Lazy-load to avoid bundle bloat. The `opencv.js` file is in the public folder of the repo.
2. Create `vision/aruco.ts` exporting async function `detectTags(imageData: ImageData): DetectedTag[]` where DetectedTag = { id: number, corners: [x,y][] }.
3. Write Vitest that loads a fixture image `four_tags.png` and asserts four IDs (any order) are detected.
4. Mock the WASM parts in Vitest to keep runtime < 3 s.

Commit: "feat(vision): ArUco detection util + tests".
```

---

### Prompt 3 – _VisionStore + live demo page_ (I2.3 + I2.4)

```text
Prerequisite: OpenCV util exists and tests pass.

**Task**
1. Add Pinia `VisionStore` with:
   - state: markersInView: DetectedTag[], accuracyLevel: 'NONE'|'LOW'|'MEDIUM'|'HIGH'
   - action `update(tags: DetectedTag[])`
2. Create route `/vision-debug` guarded by `import.meta.env.DEV`.
   - Shows video feed and a live tag count.
3. Write component test: mount store, dispatch update([...]), expect DOM updates.

Commit: "feat(vision): dev debug page with live tag count".
```

---

### Prompt 4 – _Calibration flow_ (I3.1 – I3.4)

```text
Build on previous commits.

**Task**
1. Create `CalibrationService`:
   - startCalibration(videoEl): returns live preview object with H matrix when four tags visible.
   - saveRack(name: string, snapshotCanvas)
2. Add modal Calibrate:
   - Button “Calibrate rack” -> opens camera, overlay rectangle + grid as per spec.
   - Confirm/Retake logic persists rack.
3. Unit-test Homography math with synthetic tag sets.

Ensure CI green. Commit: "feat(calibration): rack calibration workflow".
```

---

### Prompt 5 – _Location Picker_ (I4.1 – I4.3)

```text
Build on previous commits.
**Task**
1. Create Component `<LocationPicker :rackId="id" :wineId="id" />`:
   - Loads calibration photo full-screen.
   - On tap, shows magnifier, saves normalised x,y to wine.

Commit: "feat(picker): bottle location picker".
```

---

### Prompt 6 – _ARGuidanceService & FindBottle view_ (I5.1 – I5.4)

```text
**Task**
1. Implement `ARGuidanceService`:
   - Given current DetectedTags[] and rack.H, returns projected pixel of wine.location.
2. `<FindBottleView :wineId />`:
   - Camera feed, draws green circle; banner when markers <3.
3. Unit math test with synthetic data (expect ~4 px error).

Commit: "feat(ar): real-time bottle guidance".
```

---

### Prompt 7 – _Wire into WineDetail & edge-cases_ (I6 + I7)

```text
**Task**
1. Add buttons Set Location / Find Bottle to WineDetail with visibility logic from spec.
2. Edge-case handling:
   - No location → dialog + CTA.
   - Rack deleted → hide Find Bottle.
   - Permissions denied → static notice.
3. Component tests for visibility matrix.

Commit: "feat(ui): WineDetail integration & fallbacks".
```

---

### Prompt 8 – _CI, docs & final polish_ (I8)

```text
**Task**
1. Add GitHub Actions workflow: install, lint, test.
2. Failing tests block merge.
3. Update README with vision setup & troubleshooting.
4. Tag release v0.1.0.

Commit: "chore(ci): add full pipeline & docs".
```

---

### Prompt 9 – _Refactor & TODO burn-down_

```text
You have a green master.
**Task**
1. Run `npm test --coverage`; increase lines-covered to ≥ 85 %.
2. Address any TODO/FIXME comments left in vision modules.
3. Ensure lint & prettier scripts pass.

Commit: "refactor: code-health pass".
```

---

Each prompt _ends by integrating_ the new code into the previous baseline, preventing orphan artefacts. The testing scaffold grows gradually, ensuring safety while delivering visible progress. Enjoy coding!
