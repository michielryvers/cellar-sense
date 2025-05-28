**3D Plane & solvePnP Migration Plan**

This step-by-step guide walks a coding agent through migrating from 2D homography to a robust 3D-plane + solvePnP workflow. Each step is independent and verifiable. Only work at one step at a time. Commit your changes after each step. Mark the step as done by adding a green check emoji after the title of the step.

---

## 1. Camera Intrinsics Calibration

**Goal**: Obtain and load camera intrinsic matrix and distortion coefficients.

### 1.1 Add Calibration Asset

- **File**: `src/services/cameraCalibration.ts`
- **Define**:

  ```ts
  export interface Intrinsics {
    cameraMatrix: Mat;
    distCoeffs: Mat;
  }

  export async function loadIntrinsics(): Promise<Intrinsics> {
    // Load precomputed JSON or YAML file with fx, fy, cx, cy, k1..k5
  }
  ```

### 1.2 Undistort Utility

- **Same file**: add

  ```ts
  export function undistortPoints(
    points: Point2fVector,
    intrinsics: Intrinsics
  ): Point2fVector {
    // cv.undistortPoints implementation
  }
  ```

---

## 2. Update Rack Model & Calibration Storage

**Goal**: Record real-world 3D marker positions (on rack plane) and pose.

### 2.1 Extend RackDefinition

- **File**: `src/models/RackDefinition.ts`
- **Edit**: add fields

  ```ts
  export interface RackDefinition {
    id: string;
    markerIds: number[];
    markerWorldPts: Point3fVector; // 3D coords in meters/units (z=0)
    intrinsics: Intrinsics;
    rvec?: Mat; // rotation vector
    tvec?: Mat; // translation vector
  }
  ```

### 2.2 Calibrate Markers in CalibrationService

- **File**: `src/services/calibration-service.ts`
- **In** `saveCalibration(photo, detectedMarkers)`:

  1. Compute each marker center (2D) & corresponding world point (3D), e.g. using known physical tag size and rack dims.
  2. Call `solvePnP(markerWorldPts, centers2D, intrinsics.cameraMatrix, intrinsics.distCoeffs)` → `rvec`, `tvec`.
  3. Persist `rvec`, `tvec`, and `markerWorldPts` into `RackDefinition` record.

```ts
const { cameraMatrix, distCoeffs } = await loadIntrinsics();
// build worldPts, imagePts...
const [rvec, tvec] = cv.solvePnP(worldPts, imagePts, cameraMatrix, distCoeffs);
rackDef.rvec = rvec;
rackDef.tvec = tvec;
await saveRackDefinition(rackDef);
```

---

## 3. Remove 2D Homography Workflow

**Goal**: Deprecate `computeHomography` and related functions.

### 3.1 Deprecate Homography Methods

- **File**: `src/services/aruco-homography.ts` (or wherever homography lives)
- **Action**: Mark `computeHomography`, `projectWithHomography`, `projectWithSimilarity` as deprecated. Add TODO comments.

### 3.2 Clean ARGuidanceService

- **File**: `src/services/ARGuidanceService.ts`
- **Remove**: calls to `computeHomography`. Replace with PnP-based projection logic.

---

## 4. Implement solvePnP-Based Projection

**Goal**: Project arbitrary 3D bottle points onto image using pose.

### 4.1 Add projectBottle Function

- **File**: `src/services/ARGuidanceService.ts`
- **Define**:

  ```ts
  export function projectBottle(
    locationNorm: { x: number; y: number },
    rackDef: RackDefinition
  ): { x: number; y: number } {
    // 1. Compute worldPt: [u*w, v*h, 0]
    // 2. projectPoints(worldPt, rvec, tvec, cameraMatrix, distCoeffs)
  }
  ```

### 4.2 Update Frame Processing

- **File**: `src/components/FindBottleView.vue`
- **In** `processVideoFrame`:

  1. Detect markers → imagePts.
  2. Undistort imagePts.
  3. Re-run `solvePnP` to update rackDef.rvec/tvec per frame (if desired).
  4. Call `projectBottle` to get screen coords for each saved bottle.

---

## 5. UI Integration & Edge Cases

**Goal**: Display off-grid bottles and feedback.

### 5.1 FindBottleView Overlay

- **File**: `src/components/FindBottleView.vue`
- **Replace**: existing drawing code with:

  ```ts
  const screen = projectBottle(locations[i], rackDef);
  if (onScreen(screen)) {
    drawCircle(screen.x, screen.y);
  } else {
    drawEdgeArrow(screen);
  }
  ```

### 5.2 LocationPicker Guidance

- **File**: `src/components/LocationPicker.vue`
- **Add**:

  - Dotted grid extension showing logical u∈\[-0.5,1.5], v∈\[-0.5,1.5].
  - Tooltip for out-of-range normalized values.

---

## Verification Checklist

1. **Camera Calibration** loads without errors and undistortPoints works.
2. **Calibration Save** stores rvec/tvec properly in the DB.
3. **Finding Markers** across frames yields stable rvec/tvec.
4. **projectBottle** shows correctly positioned overlays on-camera.
5. **Off-grid** coordinates render with edge arrows and labels.
6. **Deprecated 2D code** is removed or disabled.

---

This plan can be executed point-by-point by a coding agent, allowing validation after each step.
