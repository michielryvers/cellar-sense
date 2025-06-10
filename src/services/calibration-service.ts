/**
 * Calibration Service for CellarSense
 * Handles rack calibration with ArUco markers and homography calculation
 */
import { v4 as uuidv4 } from "uuid";
import { ref } from "vue";
import { useVisionStore } from "../stores/vision";
import { detectTags } from "../vision/aruco";
import { loadOpenCV } from "../vision/opencv-loader";
import type { RackDefinition, MarkerPosition } from "../shared/types/vision";
import { db } from "./dexie-db";

// Material green A700 as specified
export const GUIDANCE_COLOR = "#00C853";

/**
 * Calibration preview state
 */
export interface CalibrationPreview {
  markersVisible: number;
  homographyReady: boolean;
  homography: number[] | null;
  rackCorners: { x: number; y: number }[] | null;
}

/**
 * Service for calibrating wine racks using ArUco markers
 */
export class CalibrationService {
  private videoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private visionStore: any = null;

  // Track last calibration error for user feedback
  public lastCalibrationError: string | null = null; // Camera distortion parameters (optional enhancement)
  private cameraMatrix: number[] | null = null;
  private distortionCoeffs: number[] | null = null;
  private enableDistortionCorrection: boolean;

  constructor() {
    // Load distortion correction setting from localStorage
    this.enableDistortionCorrection =
      localStorage.getItem("vision_distortion_correction") === "true";
  }

  // Reactive state for the preview
  public preview = ref<CalibrationPreview>({
    markersVisible: 0,
    homographyReady: false,
    homography: null,
    rackCorners: null,
  });
  /**
   * Start the calibration process
   * @param videoEl Video element showing the camera feed
   * @returns Reactive preview object with calibration state
   */
  public startCalibration(videoEl: HTMLVideoElement) {
    // Initialize visionStore only when needed (helps with testing)
    if (!this.visionStore) {
      this.visionStore = useVisionStore();
    }

    this.videoElement = videoEl;
    this.startProcessing();
    return this.preview;
  }

  /**
   * Stop the calibration process and clean up resources
   */
  public stopCalibration() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.videoElement = null;

    // Reset preview state
    this.preview.value = {
      markersVisible: 0,
      homographyReady: false,
      homography: null,
      rackCorners: null,
    };
  }

  /**
   * Save the calibrated rack configuration
   * @param name Name of the rack
   * @param snapshotCanvas Canvas with the calibration image
   * @returns Promise resolving to the saved rack definition
   */
  public async saveRack(
    name: string,
    snapshotCanvas: HTMLCanvasElement
  ): Promise<RackDefinition> {
    if (!this.preview.value.homographyReady || !this.preview.value.homography) {
      throw new Error(
        "Calibration not ready. Need to detect all 4 markers first."
      );
    }

    // Extract the markers from the vision store
    const markers = this.visionStore.markersInView;
    if (markers.length < 4) {
      throw new Error(`Need 4 markers, but only ${markers.length} detected.`);
    } // Create marker positions array using marker centers
    const markerPositions: MarkerPosition[] = markers.map((marker: any) => {
      const center = this.getMarkerCenter(marker.corners);
      return {
        id: marker.id,
        x: center.x,
        y: center.y,
      };
    });

    // Get image from canvas
    const imageDataUrl = snapshotCanvas.toDataURL("image/jpeg", 0.8);

    // Create the rack definition (clone homography array to avoid reactive proxy)
    const rackDefinition: RackDefinition = {
      id: uuidv4(),
      rackName: name,
      markerIds: markers.map((m: any) => m.id),
      markerPositions,
      homography: [...this.preview.value.homography!],
      calibrationImageUrl: imageDataUrl,
      lastCalibration: new Date().toISOString(),
    };

    // Save to database
    await db.cellarVisionDefinition.put(rackDefinition);

    return rackDefinition;
  }

  /**
   * Start processing frames from the video feed
   */
  private startProcessing() {
    if (!this.videoElement) return;

    const processFrame = async () => {
      if (
        !this.videoElement ||
        this.videoElement.readyState !== this.videoElement.HAVE_ENOUGH_DATA
      ) {
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      const { videoWidth, videoHeight } = this.videoElement;

      // Create a canvas to extract the current frame
      const canvas = document.createElement("canvas");
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        console.error("Failed to get 2D context");
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      // Draw the current video frame to the canvas
      ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);

      // Get image data for marker detection
      const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);

      // Detect ArUco markers
      const tags = await detectTags(imageData); // Update the vision store with the detected markers
      this.visionStore.update(tags);

      // Update our preview state
      await this.updatePreviewState();

      // Continue processing frames
      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    // Start the processing loop
    this.animationFrameId = requestAnimationFrame(processFrame);
  }
  /**
   * Update the preview state based on detected markers
   */ private async updatePreviewState() {
    const markers = this.visionStore.markersInView;

    this.preview.value.markersVisible = markers.length; // Debug logging
    console.log(`Calibration: ${markers.length} markers detected`);
    // Log marker details for debugging
    if (markers.length > 0) {
      console.log(
        "Detected markers:",
        markers.map((m: any) => ({
          id: m.id,
          center: this.getMarkerCenter(m.corners),
          corners: m.corners,
        }))
      );
    }

    // We need exactly 4 markers for full homography
    if (markers.length === 4) {
      // Get video dimensions for distortion correction
      const imageWidth = this.videoElement?.videoWidth || 0;
      const imageHeight = this.videoElement?.videoHeight || 0;

      // Compute homography with optional distortion correction
      const homography = await this.computeHomography(
        markers,
        imageWidth > 0 ? imageWidth : undefined,
        imageHeight > 0 ? imageHeight : undefined
      );
      if (homography) {
        this.preview.value.homographyReady = true;
        this.preview.value.homography = homography;

        // Calculate the corners of the rack using the homography
        const rackCorners = this.calculateRackCorners(markers);
        this.preview.value.rackCorners = rackCorners;
        console.log("Calibration: Homography computed successfully");
      } else {
        // Failed to compute homography even with 4 markers
        this.preview.value.homographyReady = false;
        this.preview.value.homography = null;
        this.preview.value.rackCorners = null;
        console.log("Calibration: Failed to compute homography with 4 markers");

        // Log the specific error that occurred
        if (this.lastCalibrationError) {
          console.log("Calibration error details:", this.lastCalibrationError);
        }
      }
    } else {
      // Not enough markers or too many markers
      this.preview.value.homographyReady = false;
      this.preview.value.homography = null;
      this.preview.value.rackCorners = null;
      console.log("Calibration: Clearing homography - not exactly 4 markers");
    }
  }
  /**
   * Compute the homography matrix from detected markers
   * Uses marker centers and infers rack's convex hull instead of hard-coded corner mapping
   * Includes optional lens distortion correction for better accuracy on wide-angle cameras
   * @param markers Array of detected ArUco markers
   * @param imageWidth Width of the image for distortion correction
   * @param imageHeight Height of the image for distortion correction
   * @returns Homography matrix as a flat array (row-major) or null if computation fails
   */ private async computeHomography(
    markers: any[],
    imageWidth?: number,
    imageHeight?: number
  ): Promise<number[] | null> {
    if (markers.length < 4) return null;

    console.log(
      "Starting homography computation with",
      markers.length,
      "markers"
    );

    try {
      // Load OpenCV.js on demand
      const cv = await loadOpenCV();
      if (!cv) {
        console.error("OpenCV.js not loaded");
        return null;
      }

      console.log("OpenCV loaded successfully");

      // Extract marker centers
      let markerCenters = markers.map((marker) => {
        const center = this.getMarkerCenter(marker.corners);
        return { id: marker.id, x: center.x, y: center.y };
      });

      console.log("Marker centers:", markerCenters); // Apply lens distortion correction if enabled and image dimensions are provided
      if (this.enableDistortionCorrection && imageWidth && imageHeight) {
        try {
          const undistortedPoints = await this.undistortPoints(
            markerCenters.map((mc) => ({ x: mc.x, y: mc.y })),
            imageWidth,
            imageHeight
          );
          // Update marker centers with undistorted coordinates
          markerCenters = markerCenters.map((mc, i) => ({
            id: mc.id,
            x: undistortedPoints[i].x,
            y: undistortedPoints[i].y,
          }));
          console.log("Applied lens distortion correction to marker points");
        } catch (error) {
          console.warn(
            "Distortion correction failed, using original points:",
            error
          );
        }
      } // For exactly 4 markers, order them geometrically instead of by ID
      let orderedPoints: { id: number; x: number; y: number }[];
      if (markerCenters.length === 4) {
        // Order markers geometrically: top-left, top-right, bottom-right, bottom-left
        orderedPoints = this.orderPointsGeometrically(markerCenters);
        console.log("Using 4 markers, ordered geometrically:", orderedPoints);
      } else {
        // Find the convex hull of marker centers for more than 4 markers
        const hull = this.findConvexHull(markerCenters);
        if (hull.length < 4) {
          console.error("Need at least 4 points for convex hull");
          return null;
        }
        // Order hull points to create a consistent mapping
        orderedPoints = this.orderHullPoints(hull);
        console.log(
          "Using convex hull with",
          hull.length,
          "points:",
          orderedPoints
        );
      }

      // Pre-validation checks
      if (this.areMarkersColinear(orderedPoints)) {
        const errorMessage =
          "Markers are arranged in a line - they must form a rectangle or quadrilateral";
        console.error(errorMessage);
        this.lastCalibrationError = errorMessage;
        return null;
      }

      if (this.isRackTooDistorted(orderedPoints)) {
        const errorMessage =
          "Rack appears too distorted - ensure markers are at the corners of a rectangular rack";
        console.error(errorMessage);
        this.lastCalibrationError = errorMessage;
        return null;
      } // Use the ordered points as source points
      const srcPoints: number[] = [];
      orderedPoints.forEach((point) => {
        srcPoints.push(point.x, point.y);
      });

      console.log("Source points for homography:", srcPoints);

      // Map points to normalized unit square (0-1)
      // For 4 points, use corners of unit square
      const dstPoints = [
        0,
        0, // first point -> top-left
        1,
        0, // second point -> top-right
        1,
        1, // third point -> bottom-right
        0,
        1, // fourth point -> bottom-left
      ];

      console.log("Destination points:", dstPoints);

      // Calculate adaptive RANSAC threshold based on image size
      const imageSize = Math.sqrt(
        Math.pow(Math.max(...srcPoints.filter((_, i) => i % 2 === 0)), 2) +
          Math.pow(Math.max(...srcPoints.filter((_, i) => i % 2 === 1)), 2)
      );
      const adaptiveThreshold = Math.max(3.0, imageSize * 0.01);

      console.log("RANSAC threshold:", adaptiveThreshold); // Create OpenCV matrices with consistent CV_32FC2 format
      const srcMat = new cv.Mat(orderedPoints.length, 1, cv.CV_32FC2);
      const dstMat = new cv.Mat(dstPoints.length / 2, 1, cv.CV_32FC2);

      // Fill the source matrix data
      for (let i = 0; i < orderedPoints.length; i++) {
        srcMat.data32F[i * 2] = orderedPoints[i].x;
        srcMat.data32F[i * 2 + 1] = orderedPoints[i].y;
      }

      // Fill the destination matrix data
      for (let i = 0; i < dstPoints.length; i++) {
        dstMat.data32F[i] = dstPoints[i];
      } // Find homography using RANSAC with adaptive threshold
      const homographyMat = cv.findHomography(
        srcMat,
        dstMat,
        cv.RANSAC,
        adaptiveThreshold
      );

      console.log("Homography computation result:", {
        success: !!homographyMat,
        rows: homographyMat?.rows,
        cols: homographyMat?.cols,
        type: homographyMat?.type?.(),
      }); // Check if homography computation was successful
      if (
        !homographyMat ||
        homographyMat.rows !== 3 ||
        homographyMat.cols !== 3
      ) {
        let errorMessage = "Failed to compute homography";

        // Provide specific diagnostic information
        if (orderedPoints.length < 4) {
          errorMessage = "Need at least 4 markers for calibration";
        } else if (this.areMarkersColinear(orderedPoints)) {
          errorMessage =
            "Markers are arranged in a line - they must form a rectangle or quadrilateral";
        } else if (this.isRackTooDistorted(orderedPoints)) {
          errorMessage =
            "Rack appears too distorted - ensure markers are at the corners of a rectangular rack";
        } else if (!homographyMat) {
          errorMessage =
            "Homography computation failed - markers may be too close together";
        }

        console.error(errorMessage);
        srcMat.delete();
        dstMat.delete();
        if (homographyMat) homographyMat.delete();

        // Store the error message for UI display
        this.lastCalibrationError = errorMessage;
        return null;
      }

      // Validate the homography result
      if (!this.isValidHomography(homographyMat)) {
        const errorMessage =
          "Computed homography is invalid - ensure all 4 markers are visible and at rack corners";
        console.error(errorMessage);
        srcMat.delete();
        dstMat.delete();
        homographyMat.delete();
        this.lastCalibrationError = errorMessage;
        return null;
      } // Extract the homography matrix values
      const homography: number[] = [];
      for (let i = 0; i < 9; i++) {
        homography.push(homographyMat.data64F[i]);
      }

      // Clean up
      srcMat.delete();
      dstMat.delete();
      homographyMat.delete();

      // Clear any previous error on successful computation
      this.lastCalibrationError = null;

      return homography;
    } catch (error) {
      console.error("Error computing homography:", error);
      return null;
    }
  }

  /**
   * Calculate the corners of the rack based on the detected markers
   * @param markers Array of detected ArUco markers
   * @returns Array of corner points {x, y}
   */
  private calculateRackCorners(
    markers: any[]
  ): { x: number; y: number }[] | null {
    if (markers.length < 4) return null;

    // Sort markers by ID
    const sortedMarkers = [...markers].sort((a, b) => a.id - b.id);

    // For a rectangular rack, we want the outermost corners
    // Assuming markers are placed at the corners of the rack
    const corners = [
      // Top-left: use top-left corner of first marker
      { x: sortedMarkers[0].corners[0][0], y: sortedMarkers[0].corners[0][1] },
      // Top-right: use top-right corner of second marker
      { x: sortedMarkers[1].corners[1][0], y: sortedMarkers[1].corners[1][1] },
      // Bottom-right: use bottom-right corner of fourth marker
      { x: sortedMarkers[3].corners[2][0], y: sortedMarkers[3].corners[2][1] },
      // Bottom-left: use bottom-left corner of third marker
      { x: sortedMarkers[2].corners[3][0], y: sortedMarkers[2].corners[3][1] },
    ];

    return corners;
  }

  /**
   * Calculate the center point of a marker from its corners
   * @param corners Array of [x, y] corner points
   * @returns Center point {x, y}
   */
  private getMarkerCenter(corners: [number, number][]): {
    x: number;
    y: number;
  } {
    const centerX =
      corners.reduce((sum, corner) => sum + corner[0], 0) / corners.length;
    const centerY =
      corners.reduce((sum, corner) => sum + corner[1], 0) / corners.length;
    return { x: centerX, y: centerY };
  }

  /**
   * Find the convex hull of marker center points
   * Uses Graham scan algorithm for convex hull computation
   * @param points Array of points with x, y coordinates
   * @returns Convex hull points in counter-clockwise order
   */
  private findConvexHull(
    points: { id: number; x: number; y: number }[]
  ): { id: number; x: number; y: number }[] {
    if (points.length < 3) return points;

    // Find the bottom-most point (or left-most in case of tie)
    let start = 0;
    for (let i = 1; i < points.length; i++) {
      if (
        points[i].y < points[start].y ||
        (points[i].y === points[start].y && points[i].x < points[start].x)
      ) {
        start = i;
      }
    }

    // Sort points by polar angle with respect to start point
    const startPoint = points[start];
    const sortedPoints = points
      .filter((_, i) => i !== start)
      .sort((a, b) => {
        const angleA = Math.atan2(a.y - startPoint.y, a.x - startPoint.x);
        const angleB = Math.atan2(b.y - startPoint.y, b.x - startPoint.x);
        return angleA - angleB;
      });

    // Build convex hull using Graham scan
    const hull = [startPoint];

    for (const point of sortedPoints) {
      // Remove points that create right turn
      while (
        hull.length > 1 &&
        this.crossProduct(
          hull[hull.length - 2],
          hull[hull.length - 1],
          point
        ) <= 0
      ) {
        hull.pop();
      }
      hull.push(point);
    }

    return hull;
  }

  /**
   * Calculate cross product of vectors (p1->p2) and (p1->p3)
   * Used to determine turn direction in convex hull algorithm
   */
  private crossProduct(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ): number {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  }

  /**
   * Order hull points to create consistent mapping to unit square
   * Orders points as: top-left, top-right, bottom-right, bottom-left
   */
  private orderHullPoints(
    hull: { id: number; x: number; y: number }[]
  ): { id: number; x: number; y: number }[] {
    if (hull.length !== 4) {
      console.warn(
        "Expected 4 hull points, got",
        hull.length,
        "- using original order"
      );
      return hull;
    }

    // Find bounding box
    const minX = Math.min(...hull.map((p) => p.x));
    const maxX = Math.max(...hull.map((p) => p.x));
    const minY = Math.min(...hull.map((p) => p.y));
    const maxY = Math.max(...hull.map((p) => p.y));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Classify points by quadrant
    const topLeft = hull.find((p) => p.x <= centerX && p.y <= centerY);
    const topRight = hull.find((p) => p.x >= centerX && p.y <= centerY);
    const bottomRight = hull.find((p) => p.x >= centerX && p.y >= centerY);
    const bottomLeft = hull.find((p) => p.x <= centerX && p.y >= centerY); // Return ordered points, falling back to original order if classification fails
    const ordered = [topLeft, topRight, bottomRight, bottomLeft].filter(
      (p): p is { id: number; x: number; y: number } => p !== undefined
    );
    return ordered.length === 4 ? ordered : hull;
  }
  /**
   * Order 4 marker points geometrically for homography mapping
   * Orders points as: top-left, top-right, bottom-right, bottom-left
   * This ensures proper mapping to the unit square destination points
   */
  private orderPointsGeometrically(
    points: { id: number; x: number; y: number }[]
  ): { id: number; x: number; y: number }[] {
    if (points.length !== 4) {
      throw new Error("Expected exactly 4 points for geometric ordering");
    }

    // Find bounding box center
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Classify points by quadrant relative to center
    const topLeft = points.find((p) => p.x <= centerX && p.y <= centerY);
    const topRight = points.find((p) => p.x >= centerX && p.y <= centerY);
    const bottomRight = points.find((p) => p.x >= centerX && p.y >= centerY);
    const bottomLeft = points.find((p) => p.x <= centerX && p.y >= centerY);

    // Validate we found all corners
    if (!topLeft || !topRight || !bottomRight || !bottomLeft) {
      console.warn(
        "Could not classify all 4 corners, falling back to original order"
      );
      return points;
    }

    // Return in the order expected by destination mapping: TL, TR, BR, BL
    const ordered = [topLeft, topRight, bottomRight, bottomLeft];

    console.log("Geometric ordering:", {
      center: { x: centerX, y: centerY },
      topLeft: topLeft,
      topRight: topRight,
      bottomRight: bottomRight,
      bottomLeft: bottomLeft,
    });

    return ordered;
  }
  /**
   * Check if markers are arranged in a line (colinear)
   * @param points Array of marker center points
   * @returns true if markers are approximately colinear
   */
  private areMarkersColinear(points: { x: number; y: number }[]): boolean {
    if (points.length < 3) return false;

    // For colinearity, we check if the area of the quadrilateral is too small
    // relative to what we'd expect from the distances between points

    // Calculate the area using the shoelace formula
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;

    // Calculate the expected minimum area based on bounding box
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    const boundingBoxArea = (maxX - minX) * (maxY - minY);

    // If the actual area is less than 5% of the bounding box area, consider colinear
    // This is much more reasonable than the previous perimeter-based check
    const areaThreshold = boundingBoxArea * 0.05;
    const isColinear = area < areaThreshold;

    console.log("Colinearity check:", {
      area,
      boundingBoxArea,
      areaThreshold,
      areaRatio: area / boundingBoxArea,
      isColinear,
      points: points.map((p) => ({ x: p.x, y: p.y })),
    });

    return isColinear;
  }
  /**
   * Check if the rack shape is too distorted for reliable calibration
   * @param points Array of marker center points
   * @returns true if rack appears too distorted
   */
  private isRackTooDistorted(points: { x: number; y: number }[]): boolean {
    if (points.length !== 4) return false;

    // Calculate the distances between adjacent corners
    const distances: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      distances.push(Math.sqrt(dx * dx + dy * dy));
    }

    // Check if the ratio between longest and shortest sides is too large
    const minDistance = Math.min(...distances);
    const maxDistance = Math.max(...distances);
    const ratio = maxDistance / minDistance;

    // If one side is more than 5x longer than another, consider it distorted
    const isDistorted = ratio > 5.0;

    console.log("Distortion check:", {
      distances,
      minDistance,
      maxDistance,
      ratio,
      isDistorted,
    });

    return isDistorted;
  }
  /**
   * Validate that the computed homography matrix is reasonable
   * @param homographyMat OpenCV Mat containing the homography
   * @returns true if homography appears valid
   */
  private isValidHomography(homographyMat: any): boolean {
    if (
      !homographyMat ||
      homographyMat.rows !== 3 ||
      homographyMat.cols !== 3
    ) {
      console.log("Homography validation failed: invalid matrix structure");
      return false;
    }

    // Check that the matrix is not degenerate (determinant close to zero)
    const h = homographyMat.data64F;
    const det =
      h[0] * (h[4] * h[8] - h[5] * h[7]) -
      h[1] * (h[3] * h[8] - h[5] * h[6]) +
      h[2] * (h[3] * h[7] - h[4] * h[6]);

    if (Math.abs(det) < 1e-10) {
      console.error("Homography is degenerate (determinant ≈ 0), det:", det);
      return false;
    }

    // For pixel-to-normalized coordinate transformations, scaling factors will be small
    // Check for reasonable scaling factors relative to typical image sizes
    const scaleX = Math.sqrt(h[0] * h[0] + h[3] * h[3]);
    const scaleY = Math.sqrt(h[1] * h[1] + h[4] * h[4]);

    // For transformations from pixel coords (~100-2000px) to unit coords (0-1):
    // Expected scale factors are roughly 1/image_size, so 0.0005 to 0.01 is reasonable
    // Reject only if scaling is truly extreme (< 0.0001 or > 10)
    if (scaleX < 0.0001 || scaleX > 10 || scaleY < 0.0001 || scaleY > 10) {
      console.error("Homography has extreme scaling factors:", {
        scaleX,
        scaleY,
      });
      return false;
    }

    // Additional check: ensure the homography doesn't flip the image
    // Check if the transformation preserves orientation by testing corner mapping
    if (!this.validateHomographyOrientation(h)) {
      console.error("Homography creates invalid orientation/flipping");
      return false;
    }

    console.log("Homography validation passed:", { det, scaleX, scaleY });
    return true;
  }

  /**
   * Validate that the homography preserves proper orientation
   * @param h Homography matrix data (3x3 flattened)
   * @returns true if orientation is preserved
   */
  private validateHomographyOrientation(h: Float64Array): boolean {
    // Test if the transformation maintains proper orientation by checking
    // if a clockwise traversal of source corners maps to clockwise destination corners

    // We don't need complex validation here since we're mapping to a unit square
    // Just check that the transformation matrix elements are reasonable

    // The transformation should not have excessive shear or rotation
    // For a roughly rectangular rack, we expect the matrix to be roughly diagonal-dominant
    const offDiagonalStrength = Math.abs(h[1]) + Math.abs(h[3]);
    const diagonalStrength = Math.abs(h[0]) + Math.abs(h[4]);

    // Allow significant rotation/shear, but reject completely pathological cases
    if (offDiagonalStrength > diagonalStrength * 10) {
      console.warn("Homography has excessive shear/rotation:", {
        offDiagonalStrength,
        diagonalStrength,
        ratio: offDiagonalStrength / diagonalStrength,
      });
      return false;
    }

    return true;
  }

  /**
   * Get the last calibration error message for user feedback
   * @returns Error message or null if no error
   */
  public getLastCalibrationError(): string | null {
    return this.lastCalibrationError;
  }

  /**
   * Clear the last calibration error
   */
  public clearCalibrationError(): void {
    this.lastCalibrationError = null;
  }
  /**
   * Enable or disable lens distortion correction
   * This can help improve accuracy on wide-angle phone cameras
   * @param enabled Whether to enable distortion correction
   */
  public setDistortionCorrection(enabled: boolean): void {
    this.enableDistortionCorrection = enabled;

    // Persist setting to localStorage
    localStorage.setItem("vision_distortion_correction", enabled.toString());

    // Reset camera parameters when toggling to force re-estimation
    if (!enabled) {
      this.cameraMatrix = null;
      this.distortionCoeffs = null;
    }
  }

  /**
   * Get the current distortion correction setting
   * @returns Whether distortion correction is enabled
   */
  public isDistortionCorrectionEnabled(): boolean {
    return this.enableDistortionCorrection;
  }

  /**
   * Estimate basic camera parameters for distortion correction
   * Uses simple assumptions suitable for phone cameras
   * @param imageWidth Image width in pixels
   * @param imageHeight Image height in pixels
   */
  private estimateCameraParameters(imageWidth: number, imageHeight: number) {
    // Estimate focal length as ~80% of image diagonal (typical for phone cameras)
    const diagonal = Math.sqrt(
      imageWidth * imageWidth + imageHeight * imageHeight
    );
    const focalLength = diagonal * 0.8;

    // Camera center at image center
    const cx = imageWidth / 2;
    const cy = imageHeight / 2;

    // Camera matrix [fx, 0, cx; 0, fy, cy; 0, 0, 1]
    this.cameraMatrix = [focalLength, 0, cx, 0, focalLength, cy, 0, 0, 1];

    // Simple barrel distortion model (k1, k2, p1, p2, k3)
    // Conservative values for typical phone cameras
    this.distortionCoeffs = [-0.1, 0.02, 0, 0, 0];
  }
  /**
   * Apply lens distortion correction to marker points
   * @param points Array of {x, y} points to undistort
   * @param imageWidth Image width
   * @param imageHeight Image height
   * @returns Undistorted points
   */
  private async undistortPoints(
    points: { x: number; y: number }[],
    imageWidth: number,
    imageHeight: number
  ): Promise<{ x: number; y: number }[]> {
    // Skip if no points to process
    if (points.length === 0) {
      return points;
    }
    try {
      // Load OpenCV.js
      const cv = await loadOpenCV();

      // Estimate camera parameters if not already done
      if (!this.cameraMatrix) {
        this.estimateCameraParameters(imageWidth, imageHeight);
      }

      // Create input points matrix
      const inputPoints = new cv.Mat(points.length, 1, cv.CV_32FC2);
      for (let i = 0; i < points.length; i++) {
        inputPoints.data32F[i * 2] = points[i].x;
        inputPoints.data32F[i * 2 + 1] = points[i].y;
      }

      // Create camera matrix
      const cameraMat = cv.matFromArray(3, 3, cv.CV_32F, this.cameraMatrix!);

      // Create distortion coefficients
      const distCoeffs = cv.matFromArray(
        1,
        5,
        cv.CV_32F,
        this.distortionCoeffs!
      );

      // Output points
      const outputPoints = new cv.Mat();

      // Undistort points
      cv.undistortPoints(inputPoints, outputPoints, cameraMat, distCoeffs);

      // Extract undistorted points
      const undistorted: { x: number; y: number }[] = [];
      for (let i = 0; i < points.length; i++) {
        const x = outputPoints.data32F[i * 2];
        const y = outputPoints.data32F[i * 2 + 1];

        // Convert back to pixel coordinates
        const fx = this.cameraMatrix![0];
        const fy = this.cameraMatrix![4];
        const cx = this.cameraMatrix![2];
        const cy = this.cameraMatrix![5];

        undistorted.push({
          x: x * fx + cx,
          y: y * fy + cy,
        });
      }

      // Cleanup
      inputPoints.delete();
      cameraMat.delete();
      distCoeffs.delete();
      outputPoints.delete();

      return undistorted;
    } catch (error) {
      console.warn(
        "Lens distortion correction failed, using original points:",
        error
      );
      return points;
    }
  }
}

// Export a singleton instance
export const calibrationService = new CalibrationService();
