# Cellar-Sense AR Overlay – Implementation Roadmap

**Goal.** Extend the CellarSens app that lets users _store_ a bottle of wine by snapping a picture of their rack (with AprilTag stickers as fiducials) and later _retrieve_ the bottle with an on‑camera overlay that points to its exact slot.
The stack: **apriltag-js** in a Web Worker for real‑time tag detection (≥ 20 FPS @ 480 p), **Three.js** for 3‑D overlay, **Pinia** for state, and **Dexie** for offline bottle metadata.

---

## 0  Bootstrap the tool‑chain (½ day)

| What                             | How                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Install deps**                 | `npm i three @pinia/plugin-persist apriltag-js-standalone vite-plugin-wasm vite-plugin-top-level-await`                                                                   |
| **Serve WASM & threads**         | Register `vite-plugin-wasm` + `vite-plugin-top-level-await` in `vite.config.ts`; add COOP/COEP headers (or use `coi-serviceworker`) so SharedArrayBuffer & PThreads work. |
| **Reuse camera permission flow** | Leverage the existing photo‑capture flow in your PWA.                                                                                                                     |

---

## 1  Folder / layout conventions

```
src/
 ├─ vision/                  # NEW domain layer
 │   ├─ TagDetectorWorker.ts # Apriltag in WASM
 │   ├─ kalman.ts            # optional jitter smoother
 │   └─ usePoseStore.ts      # Pinia store for (R,t), FPS…
 ├─ components/
 │   ├─ CameraView.vue       # <video> preview
 │   ├─ OverlayCanvas.vue    # Three.js overlay
 ├─ pages/
 │   └─ LocateBottle.vue     # retrieval wizard
```

Vision state lives in **Pinia** so any component can tap in without prop‑drilling.

---

## 2  `TagDetectorWorker.ts`  (\~150 LoC)

```ts
import initWasm, { ApriltagDetector } from "apriltag-js-standalone";

await initWasm();
const detector = new ApriltagDetector({ family: "tag36h11" });

self.onmessage = async ({ data }) => {
  const { bitmap, intrinsics } = data as {
    bitmap: ImageBitmap;
    intrinsics: number[];
  };
  const detections = detector.detect(bitmap, intrinsics); // [{id,R,t,corners,err}]
  self.postMessage(detections);
  bitmap.close();
};
```

Compile as a web‑worker entry via `new URL('./TagDetectorWorker.ts', import.meta.url)`.

---

## 3  `CameraView.vue`

```vue
<template>
  <video ref="video" class="w-full h-auto" playsinline muted />
</template>

<script setup lang="ts">
const video = ref<HTMLVideoElement>();
const worker = new Worker(
  new URL("@/vision/TagDetectorWorker.ts", import.meta.url)
);
const poseStore = usePoseStore();

onMounted(async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment", width: 640, height: 480 },
  });
  video.value!.srcObject = stream;
  await video.value!.play();

  const off = new OffscreenCanvas(640, 480);
  const ctx = off.getContext("2d")!;

  const loop = () => {
    ctx.drawImage(video.value!, 0, 0, 640, 480);
    off.convertToBlob({ type: "image/jpeg" }).then(async (blob) => {
      const bmp = await createImageBitmap(blob);
      worker.postMessage({ bitmap: bmp, intrinsics: poseStore.cameraK }, [bmp]);
    });
    requestAnimationFrame(loop);
  };
  loop();
});

worker.onmessage = (e) => poseStore.update(e.data);
</script>
```

_Off‑thread detection keeps UI fluid; passing `ImageBitmap` is zero‑copy._

---

## 4  `OverlayCanvas.vue`

```vue
<template><canvas ref="overlay" class="absolute inset-0" /></template>

<script setup lang="ts">
import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  ArrowHelper,
  Vector3,
} from "three";
const { pose, targetPoint } = storeToRefs(usePoseStore());

const scene = new Scene();
const cam3d = new PerspectiveCamera(64, 640 / 480, 0.05, 5);
const arrow = new ArrowHelper(new Vector3(0, 0, -1), new Vector3(), 0.2);
scene.add(arrow);

onMounted(() => {
  const renderer = new WebGLRenderer({ canvas: overlay.value!, alpha: true });
  renderer.setSize(640, 480);

  const render = () => {
    if (pose.value) cam3d.matrix.fromArray(pose.value.viewMatrix).invert();
    arrow.position.copy(targetPoint.value); // where the bottle lives
    cam3d.updateMatrixWorld();
    renderer.render(scene, cam3d);
    requestAnimationFrame(render);
  };
  render();
});
</script>
```

---

## 5  Persisting cell positions

| Moment              | Action                                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Store bottle**    | After pose available, cast a ray through the user’s tap → intersect virtual rack plane → save `{tagId, localX, localY, localZ}` in Dexie alongside bottle data. |
| **Retrieve bottle** | Load record, compute world position `worldPt = tagPose * localPt`, feed to `OverlayCanvas` so the arrow/quad points exactly there.                              |

Because coordinates are _relative to the nearest tag_, the system stays robust to viewpoint changes.

---

## 6  Smoothing & multi‑tag fusion

- Per‑axis **Kalman filter** on translation to kill jitter.
- If multiple tags visible, keep the pose with the _lowest reprojection error_ or fuse by averaging in SE‑3.

---

## 7  UX polish

- FPS + tag‑quality badge (green ≥ 15 FPS, amber 5 – 15, red < 5).
- “Lost tracking” overlay when no tag seen for > 500 ms.
- Settings toggle to enable/disable AR overlay.

---

## 8  Testing & CI

- **Vitest**: pipe a recorded 480 p video through the worker and assert detection counts.
- GitHub Actions runs tests on every push.
- Pre‑cache `apriltag.wasm` via Vite‑PWA so offline launches are instant.

---

## 9  Performance checklist

| Tip                                         | Reason                                              |
| ------------------------------------------- | --------------------------------------------------- |
| Serve with **crossOriginIsolated**          | unlocks SharedArrayBuffer → multi‑threaded Apriltag |
| Down‑scale to **480 p**                     | detection cost ∝ pixels; keeps ≥ 20 FPS             |
| Send every 2nd frame to worker              | prevents UI jank on low‑end phones                  |
| `<video>` with `image-rendering: pixelated` | crisp preview despite down‑scale                    |

---

## Suggested timeline

| Order | Milestone                                    |
| ----- | -------------------------------------------- |
| **1** | Deps compiled, camera preview runs under COI |
| **2** | Tag detection & pose visualised              |
| **3** | Tap‑to‑store workflow, Dexie persistence     |
| **4** | Retrieval overlay, Kalman smoothing          |
| **5** | Edge cases, UX polish, CI, docs              |

---
