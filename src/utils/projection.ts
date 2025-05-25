/**
 * Utility functions for projecting points between coordinates systems
 * Used for bottle location finding
 */

/**
 * Calculate homography matrix from source to destination points
 *
 * @param srcPoints - Array of source points [x, y]
 * @param dstPoints - Array of destination points [x, y]
 * @returns 3x3 homography matrix as flat array
 */
export function calculateHomography(
  srcPoints: [number, number][],
  dstPoints: [number, number][]
) {
  // This is a placeholder for a real homography calculation
  // A real implementation would solve the system of linear equations
  // For now, we'll use a simple transformation

  // In a real implementation, we would:
  // 1. Normalize the points
  // 2. Setup the equation system (DLT algorithm)
  // 3. Solve using SVD
  // 4. Denormalize the homography

  // Return identity homography (no transformation)
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

/**
 * Project a point using a homography matrix
 *
 * @param point - Point [x, y] to project
 * @param homography - 3x3 homography matrix as flat array
 * @returns Projected point [x, y]
 */
export function projectPoint(
  point: [number, number],
  homography: number[]
): [number, number] {
  // Apply homography transformation
  const [x, y] = point;

  const w = homography[6] * x + homography[7] * y + homography[8];
  const projectedX =
    (homography[0] * x + homography[1] * y + homography[2]) / w;
  const projectedY =
    (homography[3] * x + homography[4] * y + homography[5]) / w;

  return [projectedX, projectedY];
}

/**
 * Calculate the projected bottle position based on tag detection
 *
 * @param referenceTag - Reference tag position (corners) in reference photo
 * @param detectedTag - Detected tag position (corners) in current frame
 * @param bottleLocation - Normalized bottle coordinates (0-1) in reference photo
 * @param canvasWidth - Width of the canvas/frame
 * @param canvasHeight - Height of the canvas/frame
 * @returns Projected bottle position in current frame [x, y]
 */
export function calculateBottlePosition(
  referenceTag: { corners: [number, number][] },
  detectedTag: { corners: [number, number][] },
  bottleLocation: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): [number, number] {
  // For a simplified MVP implementation, we'll use a basic approach:
  // - Calculate the center of the tag
  // - Use the relative position of the bottle to the tag

  // Calculate centers
  const centerDetected = calculateCenter(detectedTag.corners);

  // For a simple approximation, assume linear relationship between tag and bottle
  // A proper implementation would use the homography transform

  // Convert normalized coordinates (0-1) to pixel coordinates in current frame
  const bottleX =
    centerDetected[0] + (bottleLocation.x - 0.5) * canvasWidth * 0.5;
  const bottleY =
    centerDetected[1] + (bottleLocation.y - 0.5) * canvasHeight * 0.5;

  return [bottleX, bottleY];
}

/**
 * Calculate the center point of a quadrilateral
 *
 * @param corners - Array of 4 corners [x, y]
 * @returns Center point [x, y]
 */
export function calculateCenter(corners: [number, number][]): [number, number] {
  // Simple center calculation - average of all corners
  const sumX = corners.reduce((sum, corner) => sum + corner[0], 0);
  const sumY = corners.reduce((sum, corner) => sum + corner[1], 0);

  return [sumX / corners.length, sumY / corners.length];
}

/**
 * Calculate distance between two points
 *
 * @param point1 - First point [x, y]
 * @param point2 - Second point [x, y]
 * @returns Euclidean distance
 */
export function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize a distance value to 0-1 range
 *
 * @param distance - Raw distance value
 * @param maxDistance - Maximum expected distance (will be clamped to 1.0)
 * @returns Normalized distance (0-1)
 */
export function normalizeDistance(
  distance: number,
  maxDistance: number
): number {
  return Math.min(1.0, Math.max(0.0, distance / maxDistance));
}
