## 1 · Feature overview

> **Goal** Enable a user of the WineCellar PWA to **store** the physical position of a bottle in a rack once and later **find** that bottle with an on-camera AR highlight.
> **Scope (MVP)** • One rack per cellar • 4 ArUco markers (4 × 4_50 dictionary, any IDs 0-15) • single XY position per bottle • guidance = green circle only.

---

## 2 · Physical marker layout

| Item                | Value                                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| Rack size (example) | 2 m × 1 m (not encoded; just to size markers)                                     |
| Number of markers   | **4**                                                                             |
| Tag size            | **5 cm × 5 cm**                                                                   |
| Placement           | Evenly spaced: top-left, top-right, bottom-left, bottom-right corners of the rack |

---

## 3 · Calibration workflow (one-time)

| Step | User Action                                                     | App Behaviour                                                   |
| ---- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| 1    | Tap **“Calibrate rack”** (settings screen)                      | Opens camera in “calibration” mode                              |
| 2    | Point at rack so **all 4 markers are visible**                  | OpenCV.js detects ArUco IDs + corners, computes homography H    |
| 3    | **Preview overlay** appears: green rectangle + faint 3 × 3 grid | User sees real-time marker outlines                             |
| 4    | User taps **“Confirm”** or **“Retake”**                         | On Confirm, store calibration; on Retake, continue live preview |

### Stored calibration payload (`cellarVisionDefinition` table)

| Field                 | Type                                                                    | Notes |
| --------------------- | ----------------------------------------------------------------------- | ----- |
| `id`                  | `string` → primary key (GUID)                                           |       |
| `rackName`            | `string`                                                                |       |
| `markerIds`           | `number[]` (length 4, order does **not** matter)                        |       |
| `markerPositions`     | `{id:number,x:number,y:number}[]` raw pixel coords in calibration image |       |
| `homography`          | `number[]` (length 9, row-major H)                                      |       |
| `calibrationImageUrl` | `string` (base64 or remote object URL)                                  |       |
| `lastCalibration`     | `Date` ISO                                                              |       |

> **Dexie initialisation**
>
> ```ts
> db.version(2).stores({
>   cellarVisionDefinition: "&id, rackName",
>   wines: "&id, name, location",
> });
> ```

---

## 4 · Coordinate system

- Origin (0,0) = **top-left** corner of the marker rectangle
- X grows **right**, Y grows **down**
- **Normalise** by dividing by rectangle width/height → values may be **< 0 or > 1** when a bottle lies outside the marker quad.

---

## 5 · Bottle-location capture

| UI entry point                                                                         | Behaviour                               |
| -------------------------------------------------------------------------------------- | --------------------------------------- |
| In **WineDetail** component, button **“Set Location”** (visible if `location` is null) | Loads the calibration image full-screen |
| User taps rack photo (magnifier shown on hover/drag)                                   | Display green dot at tap position       |
| Secondary tap **“Save”**                                                               | Persist to Wine record                  |

### Wine model addition

```ts
interface WineLocation {
  rackId: string; // FK to cellarVisionDefinition.id
  x: number; // normalised
  y: number; // normalised
}
interface Wine {
  id: string;
  /* existing fields … */
  location?: WineLocation;
}
```

---

## 6 · Finding a bottle

1. **Entry** User taps **“Find bottle”** on WineDetail.
2. **Open camera** in “find mode”.
3. **Marker detection** every frame (OpenCV.js):

| Markers in FOV | Pose recovery                                     | Overlay rule                                             |
| -------------- | ------------------------------------------------- | -------------------------------------------------------- |
| **≥ 3**        | Full homography update                            | Place green circle using H(x,y)                          |
| **2**          | Approx. similarity (scale+rotation)               | Place circle, show hint “More markers = better accuracy” |
| **1**          | Translation only (assume orientation/scale fixed) | Place circle, same hint                                  |
| **0**          | Pause overlay                                     | Grey toast “No markers visible”                          |

4. **Circle rendering**

| Attribute | Value                             |
| --------- | --------------------------------- |
| Colour    | **#00C853** (material-green-A700) |
| Radius    | **4 %** of rack width in pixels   |
| Stroke    | 3 px, semi-transparent fill 40 %  |
| Animation | none (static)                     |

5. **Hint banner** If markers < 3: small banner at top “Tip: capture more tags for higher precision”.

---

## 7 · Storage & sync

- All new tables & fields stored in existing **Dexie/IndexedDB**; Dexie Cloud handles background sync.
- No calibration data sent until sync completes to avoid half-calibrated state on other devices.

---

## 8 · Modules / code structure

| Module                       | Responsibility                                                   |
| ---------------------------- | ---------------------------------------------------------------- |
| **CalibrationService**       | Detect markers, compute H, persist rack entry                    |
| **VisionStore** (Pinia)      | Reactive state: current rack, markersInView, accuracyLevel       |
| **ARGuidanceService**        | Per-frame pose recovery & overlay drawing (Canvas / WebGL layer) |
| **LocationPicker** component | Displays calibration photo, captures XY tap                      |
| **FindBottleView** component | Camera feed + overlay + banner                                   |
| **Dexie schema v2**          | Adds `cellarVisionDefinition`, extends `Wine`                    |

---

## 9 · Edge cases & validation

1. **Wine without location** → Dialog _“No saved position for this wine”_ with primary **“Set Location”** (navigates to picker).
2. **Rack deleted** while wines still reference its `rackId` → hide “Find bottle”, surface toast in WineDetail.
3. **Viewport rotation** → recalc overlay scale each `resize` event.
4. **Camera permissions denied** → fall back to text notice and disable AR modes.

---

## 10 · Implementation checklist

1. **Add Dexie migration** for new tables/fields.
2. **Integrate OpenCV.js ArUco** (4 × 4_50 dictionary).
3. Build **Calibration** flow & preview overlay.
4. Build **LocationPicker** with magnifier & save logic.
5. Build **FindBottleView** camera overlay & fallback layers.
6. **Wire buttons** in WineDetail (“Set Location”, “Find bottle”).
7. **E2E tests**:

   - Calibration confirm / retake
   - Add bottle location
   - Find bottle with 4, 2, 1, 0 markers

8. **UX polish** (follow existing copy & dialog conventions).
9. **QA on multiple devices** (different FOVs, aspect ratios).
10. **Future hooks** (multiple racks, depth, enhanced AR cues).

---

### Ready for Dev

The above specification covers physical setup, data schema, UI flows, fallback logic, and storage—matching every MVP decision we captured. A developer can now proceed to implementation with no further ambiguities.
