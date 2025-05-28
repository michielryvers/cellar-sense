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

    this.preview.value.markersVisible = markers.length;

    // Debug logging
    console.log(`Calibration: ${markers.length} markers detected`);

    // We need exactly 4 markers for full homography
    if (markers.length === 4) {
      // Compute homography
      const homography = await this.computeHomography(markers);
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
   * Uses OpenCV.js findHomography function
   * @param markers Array of detected ArUco markers
   * @returns Homography matrix as a flat array (row-major) or null if computation fails
   */
  private async computeHomography(markers: any[]): Promise<number[] | null> {
    if (markers.length < 4) return null;

    try {
      // Load OpenCV.js on demand
      const cv = await loadOpenCV();
      if (!cv) {
        console.error("OpenCV.js not loaded");
        return null;
      }

      // Sort markers by ID to ensure consistent ordering
      const sortedMarkers = [...markers].sort((a, b) => a.id - b.id);

      // Extract all corners from markers (4 corners per marker)
      const srcPoints: number[] = [];
      sortedMarkers.forEach((marker) => {
        marker.corners.forEach((corner: number[]) => {
          srcPoints.push(corner[0], corner[1]);
        });
      });

      // Define destination points in normalized space (0-1)
      // Assuming markers are placed at corners of the rack
      const dstPoints = [
        // Marker 0 corners (top-left of rack)
        0,
        0, // top-left corner of marker
        0.1,
        0, // top-right corner of marker
        0.1,
        0.1, // bottom-right corner of marker
        0,
        0.1, // bottom-left corner of marker
        // Marker 1 corners (top-right of rack)
        0.9,
        0,
        1,
        0,
        1,
        0.1,
        0.9,
        0.1,
        // Marker 2 corners (bottom-left of rack)
        0,
        0.9,
        0.1,
        0.9,
        0.1,
        1,
        0,
        1,
        // Marker 3 corners (bottom-right of rack)
        0.9,
        0.9,
        1,
        0.9,
        1,
        1,
        0.9,
        1,
      ]; // Create OpenCV matrices
      // For point data, we need to create Float32 matrices with 2 channels (x,y pairs)
      const srcMat = new cv.Mat(srcPoints.length / 2, 1, cv.CV_32FC2);
      const dstMat = new cv.Mat(dstPoints.length / 2, 1, cv.CV_32FC2);

      // Fill the source matrix data
      for (let i = 0; i < srcPoints.length; i++) {
        srcMat.data32F[i] = srcPoints[i];
      }

      // Fill the destination matrix data
      for (let i = 0; i < dstPoints.length; i++) {
        dstMat.data32F[i] = dstPoints[i];
      }

      // Find homography using RANSAC for robustness
      const homographyMat = cv.findHomography(srcMat, dstMat, cv.RANSAC, 5.0);

      // Extract the homography matrix values
      const homography: number[] = [];
      for (let i = 0; i < 9; i++) {
        homography.push(homographyMat.data64F[i]);
      }

      // Clean up
      srcMat.delete();
      dstMat.delete();
      homographyMat.delete();

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
}

// Export a singleton instance
export const calibrationService = new CalibrationService();
