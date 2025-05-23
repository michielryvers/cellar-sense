# Cellar‑Sense AR Overlay — LLM‑Ready Implementation Plan

> **Mission statement for the agent**
> "You are a coding assistant working in the _michielryvers/cellar‑sense_ repository. Your goal is to give the user an offline‑first Vue 3 PWA that detects AprilTags stuck on a wine rack and projects a 3‑D arrow onto the live camera preview to guide retrieval of a bottle."

The plan is organised into **eight phases**. Each phase contains 1‑to‑n _LLM tickets_. A ticket is the smallest chunk you should attempt in a single conversation or pull‑request. Every ticket lists:

- **Inputs** you must gather or assume.
- **Output artifacts** the LLM must produce (code, config, tests, docs).
- **"Done when …" acceptance criteria**.

---

## Phase 0 Bootstrap the tool‑chain _(½ day)_ ✅

| Ticket  | Work                                                                                           | Inputs for LLM            | Output                                    | Done when                                                               |
| ------- | ---------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| **0.1** | Add deps: <br>`three` `@pinia/plugin-persist` `vite-plugin-wasm` `vite-plugin-top-level-await` | `package.json`            | `pnpm i` patch commit                     | lock‑file updated, `pnpm build` succeeds                                |
| **0.2** | Enable WASM+threads                                                                            | `vite.config.ts`          | plugin lines + COOP/COEP header injection | Dev server serves COI headers; `SharedArrayBuffer` available in console |
| **0.3** | Camera permission flow reuse                                                                   | existing user‑media logic | refactor into `useCamera.ts` composable   | Tests pass, no regression in label‑capture feature                      |
| **0.4** | Place compiled AprilTag files                                                                  | compiled WASM/JS files    | files in `src/lib/` directory             | Files accessible at `/src/lib/apriltag.wasm` and `/src/lib/apriltag.js` |

> **AprilTag Library Setup**
>
> The AprilTag library has been compiled from source. Place the compiled files in:
>
> - `src/lib/apriltag.wasm` - The WebAssembly binary
> - `src/lib/apriltag.js` - The JavaScript wrapper/loader
>
> These files will be served statically and imported directly in the worker.

---

## Phase 1 Real‑time Tag Detection Worker ✅

| Ticket  | Work                                                                           | Inputs                                      | Output                            | Done when                                            |
| ------- | ------------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| **1.1** | Scaffold `src/vision/TagDetectorWorker.ts`                                     | sample snippet below                        | worker file + Vite entry          | `npm run dev` logs first detection on desktop webcam |
| **1.2** | Define `Detection` TS interface `{id:number,R:number[],t:number[],err:number}` | n/a                                         | interface + export                | TS passes                                            |
| **1.3** | Unit‑test worker with recorded MP4                                             | `/test/worker.spec.ts` video blob (fixture) | Vitest that counts detections ≥ 1 | CI green                                             |

> **Snippet** (guidance only, LLM may rewrite)
>
> ```ts
> // Import from compiled files in public directory
> importScripts("lib/apriltag.js");
>
> let detector = null;
>
> // Initialize the AprilTag detector
> const initDetector = async () => {
>   // The compiled JS file should expose a global AprilTag object
>   if (typeof AprilTag !== "undefined") {
>     detector = new AprilTag.Detector({ family: "tag36h11" });
>     return true;
>   }
>   return false;
> };
>
> self.onmessage = async ({ data }: { data: FrameMsg }) => {
>   if (!detector) {
>     await initDetector();
>   }
>
>   if (detector) {
>     const res = detector.detect(data.bitmap, data.intrinsics);
>     self.postMessage(res);
>   }
>   data.bitmap.close();
> };
> ```

---

## Phase 2 Camera Preview Component

| Ticket  | Work                                                  | Inputs                    | Output                      | Done when                                            |
| ------- | ----------------------------------------------------- | ------------------------- | --------------------------- | ---------------------------------------------------- |
| **2.1** | Create `<CameraView.vue>`                             | `useCamera.ts` composable | component file              | Renders live video @ 640×480                         |
| **2.2** | Pump frames to worker through OffscreenCanvas         | TagDetectorWorker ref     | code in component           | Devtools shows ≤ 16 ms main‑thread blocking time     |
| **2.3** | Bind worker output into Pinia store `usePoseStore.ts` | Tag interface             | Pinia module + subscription | Reactive state shows `pose` objects updating ≥ 15 Hz |

---

## Phase 3 3‑D Overlay Rendering

| Ticket  | Work                                          | Inputs                     | Output              | Done when                                                 |
| ------- | --------------------------------------------- | -------------------------- | ------------------- | --------------------------------------------------------- |
| **3.1** | Scaffold `<OverlayCanvas.vue>` (Three.js)     | pose store                 | canvas component    | Overlay transparent canvas sits over video                |
| **3.2** | Convert worker pose to Three.js camera matrix | sample math                | code update         | Virtual axes line up with printed tag in manual desk test |
| **3.3** | Draw arrow or quad at `targetPoint`           | `targetPoint` reactive var | arrow helper / Mesh | Moving camera keeps arrow anchored to tag                 |

---

## Phase 4 Mapping & Persistence

| Ticket  | Work                                | Inputs                       | Output                   | Done when                                             |
| ------- | ----------------------------------- | ---------------------------- | ------------------------ | ----------------------------------------------------- |
| **4.1** | Tap‑to‑store coordinate capture     | Three.js raycaster; UI event | function in `CameraView` | Console logs `{tagId,localX,Y,Z}`                     |
| **4.2** | Save bottle record to Dexie         | existing DB schema           | DB migration + DAO       | Record persists & survives reload                     |
| **4.3** | Retrieval wizard `LocateBottle.vue` | list of bottles              | page component           | Selecting bottle opens overlay with `targetPoint` set |

---

## Phase 5 Pose Smoothing & Multi‑tag Fusion

| Ticket  | Work                                                  | Output       | Done when                                 |
| ------- | ----------------------------------------------------- | ------------ | ----------------------------------------- |
| **5.1** | JS Kalman filter wrapper around OpenCV.js             | `kalman.ts`  | Jitter amplitude ≤ 2 px on stress test    |
| **5.2** | Multi‑tag selection logic (lowest reprojection error) | store update | Overlay stays stable when 2+ tags visible |

---

## Phase 6 UX Polish

| Ticket  | Work                          | Output               | Done when                         |
| ------- | ----------------------------- | -------------------- | --------------------------------- |
| **6.1** | FPS & quality badge component | `<StatsBadge.vue>`   | Badge visible, colours match spec |
| **6.2** | Lost‑tracking overlay         | `<TrackingLost.vue>` | Shows after 500 ms no pose        |
| **6.3** | Settings toggle               | Pinia preference     | Checkbox disables overlay logic   |

---

## Phase 7 Testing & CI

| Ticket  | Work                                     | Output        | Done when            |
| ------- | ---------------------------------------- | ------------- | -------------------- |
| **7.1** | Add Vitest for Kalman module             | unit test     | Passes locally & CI  |
| **7.2** | GitHub Action: `pnpm test && pnpm build` | workflow YAML | CI turns green on PR |

---

## Phase 8 Performance & Deployment

| Ticket  | Work                                             | Output          | Done when                                  |
| ------- | ------------------------------------------------ | --------------- | ------------------------------------------ |
| **8.1** | Frame‑skipping heuristic (process every N frame) | config param    | Bottlenecked devices keep ≥ 10 FPS overlay |
| **8.2** | Pre‑cache compiled AprilTag files                | vite‑pwa config | Offline first launch < 2 s                 |
| **8.3** | Production build on GitHub Pages                 | workflow step   | Live demo URL shared                       |

> **Pre-caching Note for 8.2**: Update the PWA configuration to include:
>
> ```js
> // In vite.config.ts PWA plugin options
> includeAssets: ["apriltag/apriltag.wasm", "apriltag/apriltag.js"];
> ```

---

### Glossary / Data structures

```ts
// Pinia pose store
interface PoseState {
  viewMatrix: number[]; // 4×4 column‑major
  timestamp: number; // ms
  fps: number;
  quality: "green" | "amber" | "red";
}

interface BottleRecord {
  id: string;
  wine: string;
  stored: Date;
  tagId: number;
  localX: number;
  localY: number;
  localZ: number;
}
```

---

### Timeline at a glance (optional guideline)

```
W1  Phase 0‑1 complete, first tag detection
W2  Phase 2 live preview + Pinia pose
W3  Phase 3 overlay aligns with tag
W4  Phase 4 mapping & retrieval
W5  Clean‑ups, UX, CI, deploy
```

## Copilot instructions

- Commit after each phase
- Always run `npm run build` to make sure we haven't introduced errors before committing a phase
- Always run `npm run test` and see all tests pass before comitting
- Always write tests for each new typescript file you create

---

## How to use this document

1. **Pick the next open ticket** and feed its _Work_ + _Inputs_ to the LLM.
2. Ask the LLM to emit the **exact Output artifacts** and a minimal PR message.
3. Validate against the _Done when_ bullet.
4. Merge, then move to the subsequent ticket.

> 🥂 With this breakdown an LLM can work incrementally, producing review‑able PRs without context over‑load or scope creep.
