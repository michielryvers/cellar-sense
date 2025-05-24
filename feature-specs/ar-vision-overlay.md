# AR Vision Overlay — **Simplified Spec**

> **Mission statement for the agent**
> "You are a coding assistant working in the _cellar‑sense_ repository. Your goal is to give the user an offline‑first Vue 3 PWA that detects AprilTags stuck on a wine rack and projects a 3‑D arrow onto the live camera preview to guide retrieval of a bottle."

---

## Environment & Build Facts

- **AprilTag library** is compiled **inside a Docker container** (`apriltag-builder`) that lives in the repo root.
- The resulting `apriltag.js` & `apriltag_wasm.{js,wasm}` pair is copied into **`src/public/`** and served statically.
- The app is bundled with **Vite + NPM**; Vitest provides the unit‑test harness.

No further tool‑chain details belong in individual tickets.

---

## Incremental Feature Checklist

Below is the _only_ roadmap. Each item stays **\[ ]** until:

1. Unit / component tests cover the new code.
2. `npm run build` passes.
3. `npm run test` shows all tests passing
4. The user has manually smoke‑tested in the browser.

**The agent crosses the box (→ **\[x]**) in the commit _message_ that merges the change.**

|  №  | Feature                                                                                                                       | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
|  1  | **Install runtime deps** ‑ add `vite-plugin-wasm`, `vite-plugin-top-level-await`, `@pinia/plugin-persist`, `three`            | \[ ]   |
|  2  | **Register Wasm worker** ‑ create `TagDetectorWorker.ts`, load `apriltag_wasm.js` from `/public`, expose `{ detect(bitmap) }` | \[ ]   |
|  3  | **Show camera view** ‑ `<CameraView.vue>` streams 640×480 video using `getUserMedia`                                          | \[ ]   |
|  4  | **Pipe frames to worker** ‑ use `OffscreenCanvas` to transfer `VideoFrame` to the worker every animation‑frame                | \[ ]   |
|  5  | **Live AprilTag detection** ‑ worker posts `{id, R, t, err}` array back; console shows detections                             | \[ ]   |
|  6  | **Overlay geometry** ‑ transparent `<OverlayCanvas.vue>` (Three.js) draws origin axes on top of detected tag                  | \[ ]   |

> _Reference implementation for Steps 2–4:_ see the bare‑bones sample in [`apriltag-js-standalone/html`](https://github.com/arenaxr/apriltag-js-standalone/tree/master/html).

---

## Ticket Template (for the agent)

- **Inputs**: file paths / APIs needed. Keep short.
- **Output**: code, tests, config touched.
- **Done when**: refer to the three checklist rules above.

Stay laser‑focused: _simplest code that works_, no visual polish until **all boxes are checked**.

---
