import { Detection, FrameMsg } from "./types";

// Self-executing async function for TypeScript support in workers
(async () => {
  // Import AprilTag library
  // Note: importScripts() is only available in worker context
  self.importScripts("/cellar-sense/lib/apriltag.js");

  let detector: any = null;

  /**
   * Initialize the AprilTag detector with tag36h11 family
   */
  const initDetector = async (): Promise<boolean> => {
    if (typeof (self as any).AprilTag !== "undefined") {
      try {
        detector = new (self as any).AprilTag.Detector({
          family: "tag36h11",
          // Additional detector parameters can be configured here
          nThreads: navigator.hardwareConcurrency > 1 ? 2 : 1,
          refineEdges: true,
        });
        console.log("[Worker] AprilTag detector initialized successfully");
        return true;
      } catch (err) {
        console.error("[Worker] Failed to initialize AprilTag detector:", err);
        return false;
      }
    }
    console.warn("[Worker] AprilTag library not found");
    return false;
  };

  /**
   * Handle incoming messages from the main thread
   */
  self.onmessage = async ({ data }: { data: FrameMsg }) => {
    if (!detector) {
      const success = await initDetector();
      if (!success) {
        self.postMessage({
          error: "Failed to initialize detector",
          timestamp: data.timestamp,
        });
        if (data.bitmap && "close" in data.bitmap) {
          data.bitmap.close();
        }
        return;
      }
    }

    if (detector && data.bitmap) {
      try {
        // Create default camera intrinsics if not provided
        const intrinsics = data.intrinsics || {
          fx: data.bitmap.width / 2, // approximation based on image size
          fy: data.bitmap.width / 2,
          cx: data.bitmap.width / 2,
          cy: data.bitmap.height / 2,
        };

        // Detect AprilTags in the frame
        const detections: Detection[] = detector.detect(
          data.bitmap,
          intrinsics
        );

        // Send the detection results back to the main thread
        self.postMessage({
          detections,
          timestamp: data.timestamp,
          frameSize: {
            width: data.bitmap.width,
            height: data.bitmap.height,
          },
        });

        if (detections.length > 0) {
          console.log(
            `[Worker] Detected ${detections.length} tags:`,
            detections
              .map((d) => `ID:${d.id}, error:${d.err.toFixed(3)}`)
              .join(", ")
          );
        }
      } catch (err) {
        console.error("[Worker] Detection error:", err);
        self.postMessage({
          error: "Detection failed",
          timestamp: data.timestamp,
        });
      } finally {
        // Always close the bitmap to free resources
        if (data.bitmap && "close" in data.bitmap) {
          data.bitmap.close();
        }
      }
    }
  };

  // Signal that the worker is ready
  self.postMessage({ status: "ready" });
})();

// TypeScript worker type definition
export default {} as typeof Worker & { new (): Worker };
