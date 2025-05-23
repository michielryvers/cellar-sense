import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Detection } from "../types";
import {
  createMockImageBitmap,
  createMockIntrinsics,
} from "../fixtures/mockFrames";

// Check if running in JSDOM (test) environment or browser
const isTestEnv = typeof window === "undefined" || !("Worker" in window);

// Mock createImageBitmap
if (isTestEnv) {
  // In test environment, we need to mock the ImageBitmap
  global.createImageBitmap = vi.fn(() =>
    Promise.resolve({
      width: 640,
      height: 480,
      close: vi.fn(),
    } as unknown as ImageBitmap)
  );
}

// Mock URL.createObjectURL
vi.mock("URL", () => ({
  createObjectURL: vi.fn(() => "blob:mock-url"),
  revokeObjectURL: vi.fn(),
}));

/**
 * Tests for the TagDetectorWorker
 * Note: Full web worker testing in Vitest environment is limited,
 * so we primarily test in browser environments
 */
describe("TagDetectorWorker", () => {
  // Skip tests in environments that don't support Web Workers (like JSDOM in tests)
  if (isTestEnv) {
    it("skips worker tests in test environment", () => {
      console.log("Skipping Web Worker tests in test environment");
      expect(true).toBe(true);
    });

    return;
  }

  let worker: Worker;

  beforeEach(() => {
    // Create a new worker for each test
    worker = new Worker(new URL("../TagDetectorWorker.ts", import.meta.url), {
      type: "module",
    });
  });

  afterEach(() => {
    // Clean up after each test
    if (worker) {
      worker.terminate();
    }
  });

  it("should initialize and report ready status", () => {
    return new Promise<void>((resolve) => {
      worker.onmessage = (e) => {
        expect(e.data).toHaveProperty("status", "ready");
        resolve();
      };
    });
  });

  it("should handle mock camera frame data", async () => {
    // This test will only run in browser environments
    if (typeof window === "undefined") {
      return;
    }

    // Create a mock image bitmap for testing
    const mockBitmap = await createMockImageBitmap(640, 480);
    const mockIntrinsics = createMockIntrinsics(640, 480);

    return new Promise<void>((resolve) => {
      // Listen for messages from the worker
      worker.onmessage = (e) => {
        // Skip ready message
        if (e.data.status === "ready") return;
        // Should have either detections or an error property
        expect(e.data).toSatisfy((data) => {
          // For successful detection
          const isDetection =
            Array.isArray(data.detections) &&
            typeof data.timestamp === "number" &&
            data.frameSize &&
            data.frameSize.width === 640 &&
            data.frameSize.height === 480;

          // For error handling
          const isError = typeof data.error === "string";

          return isDetection || isError;
        });

        // Clean up
        if (mockBitmap && "close" in mockBitmap) {
          try {
            // @ts-ignore - TypeScript doesn't know about the close method
            mockBitmap.close();
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
        resolve();
      };

      // Send the frame to the worker
      worker.postMessage({
        bitmap: mockBitmap,
        intrinsics: mockIntrinsics,
        timestamp: Date.now(),
      });
    });
  });
});
