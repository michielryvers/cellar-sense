// ApriltagWorker.js - wraps public/apriltag.js as a Web Worker for Vue
// This file is loaded as a worker, so no imports/exports
importScripts("apriltag.js");
// Apriltag class is exposed via Comlink in apriltag.js
// No further code needed here, just the import
