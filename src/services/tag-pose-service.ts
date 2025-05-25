/**
 * Service for working with AprilTag poses and position tracking
 * Centralizes tag detection logic and camera pose estimation
 */

import { calculateHomography, projectPoint } from "../utils/projection";

/**
 * Tag detection result from AprilTag library
 */
export interface TagDetection {
  id: number;
  center: [number, number];
  corners: [number, number][];
  pose?: {
    R: number[][];
    t: number[];
  };
}

/**
 * Reference tag data stored with a cellar photo
 */
export interface ReferenceTag {
  id: number;
  corners: [number, number][];
  homography?: number[];
}

/**
 * Cached homography transformations between reference and live frames
 */
const homographyCache = new Map<string, number[]>();

/**
 * Get homography transformation between reference tag and detected tag
 *
 * @param referenceTag - Tag as it appears in the reference photo
 * @param detectedTag - Tag as detected in the current camera frame
 * @returns Homography matrix as flat array
 */
export function getTagHomography(
  referenceTag: ReferenceTag,
  detectedTag: TagDetection
): number[] {
  // Check cache first using tag ID as key
  const cacheKey = `${referenceTag.id}_${detectedTag.id}`;

  if (
    homographyCache.has(cacheKey) &&
    referenceTag.corners.flat().join() === detectedTag.corners.flat().join()
  ) {
    return homographyCache.get(cacheKey)!;
  }

  // Calculate homography from reference to detected
  const homography = calculateHomography(
    referenceTag.corners,
    detectedTag.corners
  );

  // Cache the result
  homographyCache.set(cacheKey, homography);

  return homography;
}

/**
 * Project a point from reference photo coordinates to current frame coordinates
 *
 * @param point - Point in reference photo [x, y]
 * @param referenceTag - Tag in reference photo
 * @param detectedTag - Tag in current frame
 * @returns Projected point in current frame [x, y]
 */
export function projectPointFromReference(
  point: [number, number],
  referenceTag: ReferenceTag,
  detectedTag: TagDetection
): [number, number] {
  const homography = getTagHomography(referenceTag, detectedTag);
  return projectPoint(point, homography);
}

/**
 * Calculate the screen coordinates for a bottle location
 *
 * @param bottleLocation - Normalized bottle coordinates in reference photo
 * @param photoWidth - Width of reference photo
 * @param photoHeight - Height of reference photo
 * @param referenceTag - Tag in reference photo
 * @param detectedTag - Tag in current frame
 * @param canvasWidth - Width of current canvas/frame
 * @param canvasHeight - Height of current canvas/frame
 * @returns Bottle position in current frame [x, y]
 */
export function calculateBottleScreenPosition(
  bottleLocation: { x: number; y: number },
  photoWidth: number,
  photoHeight: number,
  referenceTag: ReferenceTag,
  detectedTag: TagDetection,
  canvasWidth: number,
  canvasHeight: number
): [number, number] {
  // Convert normalized bottle location to pixel coordinates in reference photo
  const bottleX = bottleLocation.x * photoWidth;
  const bottleY = bottleLocation.y * photoHeight;

  // In a proper implementation, we would:
  // 1. Use the homography to project the bottle point
  // 2. Apply camera intrinsics

  // For MVP, we'll use a simple offset from tag center approach
  const refTagCenter = referenceTag.corners.reduce(
    (center, corner) => [center[0] + corner[0] / 4, center[1] + corner[1] / 4],
    [0, 0] as [number, number]
  );

  const detTagCenter = detectedTag.corners.reduce(
    (center, corner) => [center[0] + corner[0] / 4, center[1] + corner[1] / 4],
    [0, 0] as [number, number]
  );

  // Calculate offset from tag center to bottle in reference photo
  const offsetX = bottleX - refTagCenter[0];
  const offsetY = bottleY - refTagCenter[1];

  // Apply offset to detected tag center
  const scale = 1.0; // Could be calculated based on tag size for better accuracy
  return [detTagCenter[0] + offsetX * scale, detTagCenter[1] + offsetY * scale];
}

/**
 * Check if an AprilTag is visible in the current frame
 *
 * @param tagId - ID of the tag to find
 * @param detections - Current frame detections
 * @returns The found tag or null if not visible
 */
export function findTagById(
  tagId: number,
  detections: TagDetection[]
): TagDetection | null {
  return detections.find((tag) => tag.id === tagId) || null;
}
