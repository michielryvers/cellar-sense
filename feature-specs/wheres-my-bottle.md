# User prompt

I want you to map out a path forward. I added a proof of context camera view to the application that can detect apriltags in a live camera view. The ultimate goal is that the user sticks some april tags on their cellar/wine rack. The user should then get the option to mark the location where they've stored their wine on a photo they take of the cellar/wine rack. This position (apriltag aware) should be saved alongside the wine record. When the user later wants to find their wine there should be a live camera view that guides the user towards the bottle location. (overlay that marks the location? Again using apriltag for positioning). Provide me with an overview of what the solution could look like, additional components we might need, technical problems we still need to overcome, ....

# 🗺️ Roadmap – “Where’s my bottle?” feature

1. Data-layer
   • Extend `Wine` model with a `location` field

   ```ts
   interface BottleLocation {
     tagId: number; // apriltag id stuck on the rack
     x: number; // normalised 0-1 position in cellar photo
     y: number;
     cellPhotoId: string; // FK to stored reference photo
   }
   ```

   • New Dexie table `cellarPhotos` (`id`, `blob`, `width`, `height`, `createdAt`)  
   • Migration in `services/dexie-db`

2. UI / Components

   1. Cellar snapshot & calibration  
      `CellarPhotoCapture.vue` – full-screen camera (reuse `FullScreenCamera`)  
      – Detect ≥ 2 tags → grab still frame → save to `cellarPhotos`  
      – Persist detected tag poses (pixel coords + pose matrix) for that photo
   2. Bottle placement picker  
      `BottleLocationPicker.vue`  
      – Overlay saved cellar photo in a modal  
      – User taps the exact bottle spot → store `{tagId, x, y, cellPhotoId}` in wine record  
      – Simple visual (cross-hair + zoom-in lens)
   3. Retrieval helper  
      `BottleFinder.vue` – live camera overlay  
      – Continuously detect tags (logic already in `FullScreenCamera`)  
      – For requested wine:  
       • find matching `BottleLocation`  
       • compute current camera pose relative to reference tag pose (Apriltag gives R|t)  
       • project (x,y) back into live view → draw marker / arrow → distance text  
      – Optional “radar” mini-map showing orientation
   4. Menu integration  
      – “Set bottle location” button in `EditWineForm`  
      – “Find bottle” shortcut in `WineDetail`

3. Services / Helpers
   • `tagPoseService.ts`  
    ‑ centralise apriltag detection ↔ pose math (camera intrinsics, Homography if we stay 2-D)  
   • `projection.ts`  
    ‑ takes saved pixel coords + saved tag corners + live tag pose → returns screen coords  
   • `cellarPhotoService.ts`  
    ‑ CRUD for reference photos and cached WebP thumbnails

4. Technical hurdles
   • 📐 Camera calibration  
    – Mobile browsers rarely expose precise intrinsics; need a heuristic FOV or a one-time calibration step (print A4 checkerboard)  
    – For MVP accept small error: treat tags + bottle spot as coplanar → use 2-D homography (no depth)  
   • ⚡️ Real-time performance  
    – Current WASM runs in worker; maintain 15 fps on mid-range devices  
    – Reduce frame size (`videoWidth/3`) when just guiding arrow  
   • 🧭 Drift / tag visibility  
    – Require at least one reference tag visible → grey out overlay when lost  
    – Support multiple tags, blend poses (average translation) for robustness  
   • 🗂 Storage  
    – Images can be large; convert to 1280 px JPEG before persisting  
    – Clean-up dialog for old cellar photos
   • 🔦 Low-light cellars  
    – Show “turn on flashlight” button (`torch` constraint where supported)

5. Minimal dependency footprint
   • Continue using our in-house apriltag WASM (apriltag.js)  
   • For linear algebra use tiny `gl-matrix` (3 KB gzipped) or custom utils

6. Incremental delivery (one commit each)

- [ ] Add `location` & `cellarPhotos` schema + migration
- [ ] Implement `CellarPhotoCapture.vue` + storage service
- [ ] Add “Set location” flow hooked from `EditWineForm`
- [ ] Implement `BottleLocationPicker.vue` and save to wine record
- [ ] Build projection math in `tagPoseService` + `projection.ts`
- [ ] Create `BottleFinder.vue` with basic overlay (crosshair)
- [ ] Polish UI, add flashlight toggle, error states, unit tests (Vitest + jsdom canvas stubs)

## 📝 Clarifications & Implementation Notes

### 1. Data-layer

- **`Wine.location`** – extend the _real_ `shared/Wine.ts` interface instead of creating a parallel type.

  ```ts
  // filepath: src/shared/Wine.ts
  // ...existing code...
  export interface BottleLocation {
    tagId: number;
    x: number; // 0-1 in captured frame
    y: number;
    cellPhotoId: string; // FK → cellarPhotos.id (UUID)
  }

  export interface Wine {
    // ...existing props...
    location?: BottleLocation | null;
  }
  ```

- **Dexie schema & migration**
  ```ts
  // filepath: src/services/dexie-db.ts
  db.version(3)
    .stores({
      // ...existing tables...
      cellarPhotos: "id, createdAt",
    })
    .upgrade((tx) => {
      // set `location = null` on existing wines
      return tx
        .table("wines")
        .toCollection()
        .modify((w) => {
          w.location = null;
        });
    });
  ```

### 2. UI Components

| Component                  | Extra rule                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `CellarPhotoCapture.vue`   | Accept **≥ 2 distinct tags**, any ids. Uses `video.fov` heuristic from `FullScreenCamera`. |
| `BottleLocationPicker.vue` | `x`,`y` are normalised to the **full snapshot** (top-left origin).                         |
| `BottleFinder.vue`         | Relies on `projection.projectPoint()` (see API below) for marker placement.                |

### 3. Services / Helpers

- `src/services/tagPoseService.ts`
  ```ts
  export function getLiveTagPoses(): Promise<TagDetection[]>; // wraps worker
  ```
- `src/utils/projection.ts`

  ```ts
  import { TagDetection } from "@/services/tag-worker";

  export function projectPoint(
    refTags: TagDetection[],
    liveTags: TagDetection[],
    point: { x: number; y: number }
  ): { u: number; v: number }; // returns screen px
  ```

### 4. Technical hurdles

- **MVP = 2-D homography**; depth is ignored until calibration is available.

### 5. Dependencies

- Add `gl-matrix` (≈3 KB gz) if not already present.

### 6. Incremental delivery

- Step 1 also bumps Dexie version and provides the `upgrade` callback shown above.

### 7. Extra context

```ts
// filepath: src/services/tag-worker.ts
export interface TagDetection {
  id: number;
  corners: [number, number][4]; // TL,TR,BR,BL
  pose?: { R: number[][]; t: number[] }; // if intrinsics known
}
```

- `FullScreenCamera` already exposes an approximate `fov` used for quick projection math.
- UI hooks:
  - `CellarPhotoCapture` → emits `photoSaved(photoId)`
  - `BottleLocationPicker` → emits `locationSelected(location)`
- Compress cellar photos to ≤ 300 kB JPEG before persisting.
