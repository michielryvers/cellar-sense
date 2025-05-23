import { Detection, FrameMsg } from "./types";

interface TagDetectorOptions {
  /**
   * Camera intrinsic parameters - if not provided, will be estimated from image size
   */
  intrinsics?: {
    fx: number; // focal length x
    fy: number; // focal length y
    cx: number; // principal point x
    cy: number; // principal point y
  } | null;

  /**
   * Process every N frames (default: 1 = process all frames)
   * Increase this number on low-performance devices
   */
  frameSkip?: number;

  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean;
}

interface DetectionResult {
  detections: Detection[];
  timestamp: number;
  frameSize: {
    width: number;
    height: number;
  };
}

/**
 * TagDetector class - manages AprilTag detection using a Web Worker
 */
export class TagDetector {
  private worker: Worker;
  private isReady = false;
  private frameCount = 0;
  private options: {
    intrinsics: { fx: number; fy: number; cx: number; cy: number } | null;
    frameSkip: number;
    debug: boolean;
  };

  /**
   * Create a new TagDetector instance
   */
  constructor(options: TagDetectorOptions = {}) {
    // Set default options
    this.options = {
      intrinsics: options.intrinsics || null,
      frameSkip: options.frameSkip || 1,
      debug: options.debug || false,
    };

    // Log creation in debug mode
    if (this.options.debug) {
      console.log("[TagDetector] Initializing with options:", this.options);
    }

    // Create the worker
    this.worker = new Worker(
      new URL("./TagDetectorWorker.ts", import.meta.url),
      { type: "module" }
    );

    // Set up message handler
    this.worker.onmessage = (e) => {
      if (e.data.status === "ready") {
        this.isReady = true;
        if (this.options.debug) {
          console.log("[TagDetector] Worker ready");
        }
      }
    };
  }

  /**
   * Process a frame from the camera
   * @returns Promise that resolves with detection results
   */
  processFrame(frame: ImageBitmap): Promise<DetectionResult> {
    // Skip frames if frameSkip > 1
    this.frameCount++;
    if (this.frameCount % this.options.frameSkip !== 0) {
      return Promise.reject(new Error("Frame skipped"));
    }

    return new Promise((resolve, reject) => {
      // Set up one-time message handler for this specific frame
      const onMessage = (e: MessageEvent) => {
        // Remove the handler after we receive a result
        this.worker.removeEventListener("message", onMessage);

        // If there was an error, reject
        if (e.data.error) {
          reject(new Error(e.data.error));
          return;
        }

        // If this is just the ready message, ignore it
        if (e.data.status === "ready") {
          return;
        }

        // Otherwise resolve with the detection results
        resolve(e.data as DetectionResult);
      };

      // Add the message handler
      this.worker.addEventListener("message", onMessage);

      // Send the frame to the worker
      const message: FrameMsg = {
        bitmap: frame,
        intrinsics: this.options.intrinsics || undefined,
        timestamp: performance.now(),
      };

      this.worker.postMessage(message);
    });
  }

  /**
   * Clean up resources used by the detector
   */
  dispose() {
    if (this.options.debug) {
      console.log("[TagDetector] Disposing worker");
    }
    this.worker.terminate();
  }
}
