/**
 * Mock data utility for testing tag detection without real video input
 */

/**
 * Creates a mock ImageBitmap for testing
 * @returns A Promise that resolves to a mock ImageBitmap
 */
export async function createMockImageBitmap(
  width = 640,
  height = 480
): Promise<ImageBitmap> {
  // Create a canvas with a simple pattern that resembles an AprilTag
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  // Fill background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  // Draw a mock AprilTag-like pattern
  const tagSize = Math.min(width, height) / 4;
  const tagX = (width - tagSize) / 2;
  const tagY = (height - tagSize) / 2;

  // Outer black square
  ctx.fillStyle = "black";
  ctx.fillRect(tagX, tagY, tagSize, tagSize);

  // Inner white square
  ctx.fillStyle = "white";
  ctx.fillRect(
    tagX + tagSize * 0.2,
    tagY + tagSize * 0.2,
    tagSize * 0.6,
    tagSize * 0.6
  );

  // Add some "bit" patterns
  ctx.fillStyle = "black";
  // Top row
  ctx.fillRect(
    tagX + tagSize * 0.3,
    tagY + tagSize * 0.3,
    tagSize * 0.1,
    tagSize * 0.1
  );
  ctx.fillRect(
    tagX + tagSize * 0.5,
    tagY + tagSize * 0.3,
    tagSize * 0.1,
    tagSize * 0.1
  );
  // Bottom row
  ctx.fillRect(
    tagX + tagSize * 0.3,
    tagY + tagSize * 0.6,
    tagSize * 0.1,
    tagSize * 0.1
  );
  ctx.fillRect(
    tagX + tagSize * 0.6,
    tagY + tagSize * 0.5,
    tagSize * 0.1,
    tagSize * 0.1
  );

  // Convert canvas to ImageBitmap
  return createImageBitmap(canvas);
}

/**
 * Simulates a video frame sequence for testing
 * @returns An async generator that yields ImageBitmap frames
 */
export async function* createMockVideoFrames(
  numFrames = 10,
  width = 640,
  height = 480,
  frameDelayMs = 100
): AsyncGenerator<ImageBitmap> {
  for (let i = 0; i < numFrames; i++) {
    const bitmap = await createMockImageBitmap(width, height);
    yield bitmap;
    await new Promise((resolve) => setTimeout(resolve, frameDelayMs));
  }
}

/**
 * Creates mock intrinsic camera parameters based on image dimensions
 */
export function createMockIntrinsics(width = 640, height = 480) {
  // These are approximate values that work well for many cameras
  const fx = width * 0.9; // focal length x
  const fy = width * 0.9; // focal length y (usually similar to fx)
  const cx = width / 2; // principal point x (usually center of image)
  const cy = height / 2; // principal point y (usually center of image)

  return { fx, fy, cx, cy };
}
