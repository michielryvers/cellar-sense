import type { DetectedTag } from "../vision/aruco";
import type { RackDefinition, WineLocation } from "../shared/types/vision";
import { loadOpenCV } from "../vision/opencv-loader";

/**
 * Service for real-time AR guidance of bottle location.
 */
export class ARGuidanceService {
  private cv: any = null;
  private lastProjection: { x: number; y: number } | null = null;
  private smoothingFactor = 0.3; // Higher = more responsive, lower = smoother

  /**
   * Project a normalized wine location into current camera frame pixel coordinates.
   * Uses a simple bounding-box approximation based on detected tag corners.
   * @param location Normalized wine location (0-1)
   * @param detectedTags Currently detected ArUco tags
   * @param rackDef Calibration definition of the rack
   * @returns Pixel coordinates for overlay, or null if projection not possible
   */
  async project(
    location: WineLocation,
    detectedTags: DetectedTag[],
    rackDef: RackDefinition
  ): Promise<{ x: number; y: number } | null> {
    if (detectedTags.length === 0) {
      return null;
    }

    // Find matching detected tags from rack definition
    const matchedTags = detectedTags.filter((tag) =>
      rackDef.markerIds.includes(tag.id)
    );

    if (matchedTags.length === 0) {
      return null;
    }

    try {
      // Load OpenCV once and cache it
      if (!this.cv) {
        this.cv = await loadOpenCV();
      }

      let rawProjection: { x: number; y: number } | null = null;

      if (matchedTags.length >= 3) {
        // Full homography update
        rawProjection = this.projectWithHomography(
          location,
          matchedTags,
          rackDef
        );
      } else if (matchedTags.length === 2) {
        // Similarity transformation (scale + rotation)
        rawProjection = this.projectWithSimilarity(
          location,
          matchedTags,
          rackDef
        );
      } else {
        // Translation only (1 marker)
        rawProjection = this.projectWithTranslation(
          location,
          matchedTags[0],
          rackDef
        );
      }

      // Apply smoothing
      if (rawProjection) {
        if (this.lastProjection) {
          // Exponential moving average
          const smoothedX =
            this.smoothingFactor * rawProjection.x +
            (1 - this.smoothingFactor) * this.lastProjection.x;
          const smoothedY =
            this.smoothingFactor * rawProjection.y +
            (1 - this.smoothingFactor) * this.lastProjection.y;

          this.lastProjection = { x: smoothedX, y: smoothedY };
          return this.lastProjection;
        } else {
          // First frame, no smoothing
          this.lastProjection = rawProjection;
          return rawProjection;
        }
      } else {
        // Reset smoothing on tracking loss
        this.lastProjection = null;
        return null;
      }
    } catch (error) {
      console.error("Projection failed:", error);
      return null;
    }
  }

  /**
   * Reset the smoothing state (call when switching wines or racks)
   */
  reset(): void {
    this.lastProjection = null;
  }

  private projectWithHomography(
    location: WineLocation,
    matchedTags: DetectedTag[],
    rackDef: RackDefinition
  ): { x: number; y: number } | null {
    console.log(
      "projectWithHomography called with",
      matchedTags.length,
      "tags"
    );

    // Build correspondence points between calibration and current frame
    const srcPoints: number[] = [];
    const dstPoints: number[] = [];

    for (const tag of matchedTags) {
      const calibrationMarker = rackDef.markerPositions.find(
        (m) => m.id === tag.id
      );
      if (!calibrationMarker) {
        console.warn(`No calibration marker found for tag ID ${tag.id}`);
        continue;
      }

      // Use center of marker for correspondence
      const currentCenter = this.getMarkerCenter(tag.corners);
      console.log(
        `Tag ${tag.id}: calib(${calibrationMarker.x}, ${calibrationMarker.y}) -> current(${currentCenter.x}, ${currentCenter.y})`
      );

      srcPoints.push(calibrationMarker.x);
      srcPoints.push(calibrationMarker.y);
      dstPoints.push(currentCenter.x);
      dstPoints.push(currentCenter.y);
    }

    const numPoints = srcPoints.length / 2;
    if (numPoints < 4) {
      console.warn("Not enough correspondence points:", numPoints);
      return null;
    }

    let srcMat, dstMat, homography;

    try {
      // Validate input data
      if (!this.cv) {
        console.error("OpenCV not loaded");
        return null;
      }

      if (srcPoints.some((p) => !isFinite(p))) {
        console.error("Invalid source points:", srcPoints);
        return null;
      }

      if (dstPoints.some((p) => !isFinite(p))) {
        console.error("Invalid destination points:", dstPoints);
        return null;
      }      console.log("Creating matrices for", numPoints, "points");

      // Create matrices with consistent CV_32FC2 format to match calibration
      // Points should be in shape (N, 1) with 2 channels for CV_32FC2
      srcMat = new this.cv.Mat(numPoints, 1, this.cv.CV_32FC2);
      dstMat = new this.cv.Mat(numPoints, 1, this.cv.CV_32FC2);

      // Fill matrices with 2-channel data
      for (let i = 0; i < numPoints; i++) {
        srcMat.data32F[i * 2] = srcPoints[i * 2];
        srcMat.data32F[i * 2 + 1] = srcPoints[i * 2 + 1];
        dstMat.data32F[i * 2] = dstPoints[i * 2];
        dstMat.data32F[i * 2 + 1] = dstPoints[i * 2 + 1];
      }

      console.log(
        "Source matrix:",
        srcMat.rows,
        "x",
        srcMat.cols,
        "type:",
        srcMat.type()
      );
      console.log(
        "Dest matrix:",
        dstMat.rows,
        "x",
        dstMat.cols,
        "type:",
        dstMat.type()
      );

      console.log("Computing homography...");
      // Compute homography with RANSAC
      homography = this.cv.findHomography(srcMat, dstMat, this.cv.RANSAC, 5.0);

      // Validate homography matrix
      if (!homography || homography.empty()) {
        console.error("findHomography returned empty matrix");
        return null;
      }

      if (homography.rows !== 3 || homography.cols !== 3) {
        console.error(
          "Invalid homography dimensions:",
          homography.rows,
          "x",
          homography.cols
        );
        return null;
      }

      // Log homography matrix
      console.log("Homography matrix computed successfully");
      const h = [];
      for (let i = 0; i < 9; i++) {
        h.push(homography.data64F[i]);
      }
      console.log("H =", h);

      // Get rack bounds in calibration image
      const rackBounds = this.getRackBounds(rackDef.markerPositions);
      console.log("Rack bounds:", rackBounds);

      // Convert normalized location to calibration pixel coordinates
      const calibX =
        rackBounds.minX + location.x * (rackBounds.maxX - rackBounds.minX);
      const calibY =
        rackBounds.minY + location.y * (rackBounds.maxY - rackBounds.minY);
      console.log(
        `Wine location: normalized(${location.x}, ${location.y}) -> calib(${calibX}, ${calibY})`
      );

      // Validate coordinates
      if (!isFinite(calibX) || !isFinite(calibY)) {
        console.error("Invalid calibration coordinates:", calibX, calibY);
        return null;
      }

      // Project through homography - use manual computation
      const w =
        homography.data64F[6] * calibX +
        homography.data64F[7] * calibY +
        homography.data64F[8];
      const x =
        (homography.data64F[0] * calibX +
          homography.data64F[1] * calibY +
          homography.data64F[2]) /
        w;
      const y =
        (homography.data64F[3] * calibX +
          homography.data64F[4] * calibY +
          homography.data64F[5]) /
        w;

      console.log(`Projected coordinates: (${x}, ${y})`);

      if (!isFinite(x) || !isFinite(y)) {
        console.error("Invalid projected coordinates:", x, y);
        return null;
      }

      return { x, y };
    } catch (error: any) {
      console.error("Homography projection failed:", error);
      console.error("Error details:", error.message, error.stack);
      console.error("Error code:", error.code);
      return null;
    } finally {
      // Clean up
      try {
        srcMat?.delete();
        dstMat?.delete();
        homography?.delete();
      } catch (cleanupError) {
        console.warn("Cleanup error:", cleanupError);
      }
    }
  }

  private projectWithSimilarity(
    location: WineLocation,
    matchedTags: DetectedTag[],
    rackDef: RackDefinition
  ): { x: number; y: number } | null {
    // Use first two markers to estimate scale and rotation
    const tag1 = matchedTags[0];
    const tag2 = matchedTags[1];

    const calib1 = rackDef.markerPositions.find((m) => m.id === tag1.id);
    const calib2 = rackDef.markerPositions.find((m) => m.id === tag2.id);

    if (!calib1 || !calib2) return null;

    const current1 = this.getMarkerCenter(tag1.corners);
    const current2 = this.getMarkerCenter(tag2.corners);

    // Compute scale and rotation from marker pair
    const calibDx = calib2.x - calib1.x;
    const calibDy = calib2.y - calib1.y;
    const currentDx = current2.x - current1.x;
    const currentDy = current2.y - current1.y;

    const calibDist = Math.sqrt(calibDx * calibDx + calibDy * calibDy);
    const currentDist = Math.sqrt(
      currentDx * currentDx + currentDy * currentDy
    );

    if (calibDist === 0) return null;

    const scale = currentDist / calibDist;
    const calibAngle = Math.atan2(calibDy, calibDx);
    const currentAngle = Math.atan2(currentDy, currentDx);
    const rotation = currentAngle - calibAngle;

    // Get rack bounds and convert location
    const rackBounds = this.getRackBounds(rackDef.markerPositions);
    const calibX =
      rackBounds.minX + location.x * (rackBounds.maxX - rackBounds.minX);
    const calibY =
      rackBounds.minY + location.y * (rackBounds.maxY - rackBounds.minY);

    // Apply similarity transformation relative to first marker
    const relativeX = calibX - calib1.x;
    const relativeY = calibY - calib1.y;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const transformedX = (relativeX * cos - relativeY * sin) * scale;
    const transformedY = (relativeX * sin + relativeY * cos) * scale;

    return {
      x: current1.x + transformedX,
      y: current1.y + transformedY,
    };
  }

  private projectWithTranslation(
    location: WineLocation,
    tag: DetectedTag,
    rackDef: RackDefinition
  ): { x: number; y: number } | null {
    const calibMarker = rackDef.markerPositions.find((m) => m.id === tag.id);
    if (!calibMarker) return null;

    const currentCenter = this.getMarkerCenter(tag.corners);

    // Simple translation - assume same scale and orientation
    const rackBounds = this.getRackBounds(rackDef.markerPositions);
    const calibX =
      rackBounds.minX + location.x * (rackBounds.maxX - rackBounds.minX);
    const calibY =
      rackBounds.minY + location.y * (rackBounds.maxY - rackBounds.minY);

    const offsetX = currentCenter.x - calibMarker.x;
    const offsetY = currentCenter.y - calibMarker.y;

    return {
      x: calibX + offsetX,
      y: calibY + offsetY,
    };
  }

  private getMarkerCenter(corners: [number, number][]): {
    x: number;
    y: number;
  } {
    const sumX = corners.reduce((sum, corner) => sum + corner[0], 0);
    const sumY = corners.reduce((sum, corner) => sum + corner[1], 0);
    return {
      x: sumX / corners.length,
      y: sumY / corners.length,
    };
  }

  private getRackBounds(markerPositions: { x: number; y: number }[]) {
    const xs = markerPositions.map((m) => m.x);
    const ys = markerPositions.map((m) => m.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }
}
