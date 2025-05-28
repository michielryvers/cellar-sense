/**
 * ArUco marker detection utilities
 * Uses OpenCV.js to detect ArUco markers in images
 */
import { loadOpenCV } from "./opencv-loader";

/**
 * Represents a detected ArUco marker
 */
export interface DetectedTag {
  /** ArUco marker ID */
  id: number;
  /** Corner points of the marker in [x,y] format, clockwise from top-left */
  corners: [number, number][];
}

// Cache the detector to avoid recreating it every frame
let cachedDetector: any = null;
let cachedDictionary: any = null;
let cachedParameters: any = null;
let cachedRefineParameters: any = null;

/**
 * Detects ArUco markers in an image
 * @param imageData - ImageData object containing the image to process
 * @returns Array of detected ArUco markers
 */
export const detectTags = async (
  imageData: ImageData
): Promise<DetectedTag[]> => {
  let src: any;
  let gray: any;
  let corners: any;
  let ids: any;

  try {
    // Load OpenCV.js on demand
    const cv = await loadOpenCV();

    // Convert ImageData to OpenCV Mat
    src = cv.matFromImageData(imageData);

    // Convert to grayscale for better detection
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);    // Create ArUco detector with 4x4_50 dictionary (cache it)
    if (!cachedDetector) {
      cachedDictionary = cv.getPredefinedDictionary(cv.DICT_4X4_50);
      cachedParameters = new cv.aruco_DetectorParameters();
      cachedRefineParameters = new cv.aruco_RefineParameters(10, 3, true);
      cachedDetector = new cv.aruco_ArucoDetector(
        cachedDictionary,
        cachedParameters,
        cachedRefineParameters
      );
      // Keep parameters alive for the detector's lifetime
    }

    // Detect markers
    corners = new cv.MatVector();
    ids = new cv.Mat();
    cachedDetector.detectMarkers(gray, corners, ids);

    const result: DetectedTag[] = [];

    // Process detection results
    if (ids.rows > 0) {
      for (let i = 0; i < ids.rows; i++) {
        const id = ids.data32S[i];
        const cornersMat = corners.get(i);
        const tagCorners: [number, number][] = [];

        // Extract corner coordinates (4 corners per marker)
        for (let j = 0; j < 4; j++) {
          const x = cornersMat.data32F[j * 2];
          const y = cornersMat.data32F[j * 2 + 1];
          tagCorners.push([x, y]);
        }

        result.push({
          id,
          corners: tagCorners,
        });
      }
    }    return result;
  } catch (error) {
    console.error("ArUco detection failed:", error);
    // Re-throw critical errors but return empty array for recoverable ones
    if (error instanceof Error && error.message.includes('WebAssembly')) {
      throw new Error(`OpenCV WebAssembly error: ${error.message}`);
    }
    return [];
  } finally {
    // Clean up OpenCV resources properly
    try {
      src?.delete();
      gray?.delete();
      
      // Properly clean up MatVector - delete each Mat inside before deleting the vector
      if (corners) {
        for (let i = 0; i < corners.size(); i++) {
          const cornerMat = corners.get(i);
          cornerMat?.delete();
        }
        corners.delete();
      }
      
      ids?.delete();
    } catch (cleanupError) {
      console.warn("Cleanup error in ArUco detection:", cleanupError);
    }
  }
};

/**
 * Cleans up cached ArUco detector resources
 * Should be called when the detector is no longer needed
 */
export const cleanupDetector = (): void => {
  try {
    cachedDetector?.delete();
    cachedDictionary?.delete();
    cachedParameters?.delete();
    cachedRefineParameters?.delete();
  } catch (error) {
    console.warn("Error cleaning up ArUco detector:", error);
  } finally {
    cachedDetector = null;
    cachedDictionary = null;
    cachedParameters = null;
    cachedRefineParameters = null;
  }
};
