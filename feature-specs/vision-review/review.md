Below is a focused review of your vision/OpenCV flows, organized by stage. I’ve called out places where assumptions or resource‐management issues may lead to brittle behavior, incorrect mappings, or memory leaks. This isn’t about style or formatting, but about whether the algorithms will actually work robustly in real use.

---

## 1. ArUco Detection (`src/vision/aruco.ts`) ✅

- **Corner‐by‐corner cleanup & memory leaks**
  You allocate a `MatVector` for `corners`, then call `corners.delete()` in your `finally` block. In OpenCV.js, deleting a `MatVector` does _not_ automatically delete each `Mat` inside it – you need to iterate `corners.get(i).delete()` before deleting the vector itself. Otherwise every frame you leak four small Mats. The same goes for `ids` if it wraps internal buffers.&#x20;

- **Parameter deletion race**
  You build the `aruco_ArucoDetector` with `parameters` and `refineParameters`, then immediately call `parameters.delete()` and `refineParameters.delete()`. If the detector internally holds references, this could free memory it still needs. It’s safer to keep both alive as long as you plan to use the detector.&#x20;

- **Silent failure hides errors**
  Catching all errors in `detectTags` and returning `[]` might hide critical failures (e.g. WebAssembly load issues, unexpected exceptions). Consider re‐throwing or at least logging with more context or a user‐facing error flag instead of just an empty result.&#x20;

---

## 2. Calibration Flow (`CalibrationService`) ✅

### 2.1 Marker Placement Assumptions

- **Rigid corner mapping**
  Your `computeHomography` presumes that the _sorted_ marker IDs map exactly to the four rack corners (top-left, top-right, etc.) and that each marker’s physical size occupies 10% of rack width/height (`dstPoints` uses 0.1 and 0.9 constants). But your spec allows tags “not necessarily on outside corners.” If users scatter markers anywhere, that bake-in corner assumption breaks the homography. You must either:

  1. **Enforce** specific IDs at each corner (and forbid arbitrary placement), _or_
  2. **Infer** the rack’s convex hull of marker centers and map that to normalized unit square, rather than hard-coding dstPoints.&#x20;

- **Marker orientation & corner ordering**
  You push all four corners per marker into `srcPoints`, but index them assuming `corners[0]` is “top-left.” ARUco’s corner ordering is consistent, but if a marker is rotated (e.g. on its side), your `dstPoints` mapping may invert axes. A more robust approach is to use only the _center_ of each marker for correspondence; this both reduces the number of points and avoids orientation mismatch.&#x20;

### 2.2 Homography Computation

- **Matrix types mismatch**
  In `computeHomography` you correctly build two Mats of type `CV_32FC2` shaped as `(N, 1)`. But in `ARGuidanceService.projectWithHomography` you later rebuild mats with `new Mat(numPoints, 2, CV_32F)` (i.e. single‐channel floats). OpenCV expects two‐channel (`CV_32FC2`) data or Nx1 two‐channel Mats. Passing a single‐channel Nx2 mat may work accidentally, but is not guaranteed across platforms. Unify on `CV_32FC2` for both.&#x20;

- **RANSAC threshold hard-coded**
  You use `cv.RANSAC` with a pixel threshold of `5.0`. On high-resolution cameras, a 5px reprojection error may be too strict; on low-res, too lax. Consider scaling the threshold relative to the image diagonal or allowing it to be configured.&#x20;

---

## 3. Bottle Location Picker (`LocationPicker.vue`) ✅

- **Normalization vs. Display scaling**
  You compute `normalizedPosition.x = offsetX / naturalWidth`. But `event.offsetX` is relative to the _displayed_ image size (subject to CSS `object-contain`, container resizing, etc.), while `naturalWidth` is the intrinsic pixel width. If the image is scaled down in the UI, you’ll under- or overestimate coordinates. Instead:

  ```ts
  const rect = imageElement.getBoundingClientRect();
  const scaleX = imageElement.naturalWidth / rect.width;
  normalizedX = (offsetX * scaleX) / imageElement.naturalWidth;
  ```

  (and similarly for Y).&#x20;

---

## 4. AR Overlay & Projection (`ARGuidanceService` & `FindBottleView.vue`) ✅

### 4.1 Projection Logic

- **Recomputing vs. reusing homography**
  At calibration you computed and stored a homography mapping _calibration image → normalized rack space_. In AR you recompute a fresh homography mapping _calibration rack positions → current frame_ each time. That works, but you’re ignoring the stored homography and any lens distortion corrections you might have captured. It’d be more consistent to:

  1. Use the stored calibration homography to map bottle to calibration‐image pixel.
  2. Compute one homography per frame (or update via PnP) from calibration‐image → current frame.
  3. Chain them for projection.

- **Fallbacks ignore rotation/scale**
  For 2 markers you use similarity transform, and for 1 marker just translation. But if the camera rotates (portrait/landscape) or the rack plane is tilted, translation‐only will totally misplace your overlay. It may be better to refuse to project unless you have at least 2 markers, or to estimate a minimal affine with 3 points for rotation + scale.

### 4.2 Performance & Smoothing

- **Per-frame Mat allocations**
  In `processVideoFrame` and `FindBottleView` you create a fresh `<canvas>` and `ImageData` each time. This incurs GC pressure. Reuse a single offscreen canvas and context to keep memory stable.

- **Adaptive frame skipping**
  You process every 3rd frame in AR to reduce CPU, but “3” is arbitrary. Monitor processing latency and adaptively drop frames to maintain 30 fps capture.

- **Smoothing state resets**
  You call `guidance.reset()` on mount, but if the user switches wines mid-stream, the old smoothing buffer persists until next mount. Consider monitoring wine/rack changes to fully reset.

---

## 5. Overall Error Handling & Edge Cases

- **User feedback on failure** ✅
  If homography fails (e.g. colinear tags, too noisy), the UI simply disables “Confirm” or shows “Please capture all 4 markers.” It might help to display a warning like “Markers must not lie on a single line,” or show which markers are missing.

- **Physical marker size & rack aspect ratio**
  You assume the markers occupy exactly 10% of the rack dimension. In practice, physical markers may be larger or smaller relative to rack width, skewing the grid. Better to calibrate by the _centers_ of the outermost markers and ignore marker extents.

- **Lens distortion**
  OpenCV’s `findHomography` does no distortion correction. On wide-angle phone cameras, barrel distortion could cause non‐planar effects at the rack edges. You may get better results by first calibrating the camera lens (or at least using `undistortPoints`) before your homography.

---

### Summary of Key Action Items

1. **Revise homography setup** so it uses marker centers, infers the rack’s convex hull, and avoids hard-coded dstPoints.
2. **Fix MatVector cleanup** — delete each inner `Mat` before deleting the vector.
3. **Use consistent Mat types** (`CV_32FC2`) for both calibration and AR.
4. **Correct normalization** in `LocationPicker` to account for displayed image scaling.
5. **Enhance failure modes** with user-facing diagnostics when detection or homography fails.

Addressing these will make your AR bottle finder far more robust across real-world marker placement, varying camera resolutions, and device orientations.
