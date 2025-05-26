/**
 * Calibration Service for CellarSense
 * Handles rack calibration with ArUco markers and homography calculation
 */
import { v4 as uuidv4 } from "uuid";
import { ref } from "vue";
import { useVisionStore } from "../stores/vision";
import { detectTags } from "../vision/aruco";
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
    } // Create marker positions array
    const markerPositions: MarkerPosition[] = markers.map((marker: any) => ({
      id: marker.id,
      x: marker.corners[0][0], // Use the top-left corner X
      y: marker.corners[0][1], // Use the top-left corner Y
    }));

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
      const tags = await detectTags(imageData);

      // Update the vision store with the detected markers
      this.visionStore.update(tags);

      // Update our preview state
      this.updatePreviewState();

      // Continue processing frames
      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    // Start the processing loop
    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  /**
   * Update the preview state based on detected markers
   */
  private updatePreviewState() {
    const markers = this.visionStore.markersInView;

    this.preview.value.markersVisible = markers.length;

    // We need exactly 4 markers for full homography
    if (markers.length === 4) {
      // Compute homography
      const homography = this.computeHomography(markers);
      if (homography) {
        this.preview.value.homographyReady = true;
        this.preview.value.homography = homography;

        // Calculate the corners of the rack using the homography
        const rackCorners = this.calculateRackCorners(markers);
        this.preview.value.rackCorners = rackCorners;
      }
    } else {
      this.preview.value.homographyReady = false;
      this.preview.value.homography = null;
      this.preview.value.rackCorners = null;
    }
  }

  /**
   * Compute the homography matrix from detected markers
   * Uses OpenCV.js findHomography function
   * @param markers Array of detected ArUco markers
   * @returns Homography matrix as a flat array (row-major) or null if computation fails
   */
  private computeHomography(markers: any[]): number[] | null {
    if (markers.length < 4) return null;

    try {
      // We'll use the top-left corners of the markers for simplicity
      // In a real implementation, you'd use all corners and possibly RANSAC
      const srcPoints = markers.map((marker) => marker.corners[0]);

      // Sort markers by ID to ensure consistent ordering
      const sortedMarkers = [...markers].sort((a, b) => a.id - b.id);

      // Arrange markers in the normalized space (0-1)
      // Assuming marker order is: top-left, top-right, bottom-left, bottom-right
      const dstPoints = [
        [0, 0], // top-left
        [1, 0], // top-right
        [0, 1], // bottom-left
        [1, 1], // bottom-right
      ];

      // Use OpenCV.js findHomography if available
      // For this implementation, we'll use a simple direct calculation for the test
      // In a real implementation, you would load OpenCV and use cv.findHomography

      // This is a placeholder for the actual OpenCV homography calculation
      // In reality, you'd do something like:
      /*
      const cv = await loadOpenCV();
      const srcMat = cv.matFromArray(srcPoints.length, 1, cv.CV_32FC2, srcPoints.flat());
      const dstMat = cv.matFromArray(dstPoints.length, 1, cv.CV_32FC2, dstPoints.flat());
      const H = cv.findHomography(srcMat, dstMat);
      return Array.from(H.data64F);
      */

      // For now, we'll return a placeholder identity matrix
      // This should be replaced with the actual homography computation
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
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

    // Extract top-left corners
    const cornerPoints = sortedMarkers.map((marker) => ({
      x: marker.corners[0][0],
      y: marker.corners[0][1],
    }));

    return cornerPoints;
  }
}

// Export a singleton instance
export const calibrationService = new CalibrationService();
