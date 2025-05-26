/**
 * ArUco marker detection utilities
 * Uses OpenCV.js to detect ArUco markers in images
 */
import { loadOpenCV } from './opencv-loader';

/**
 * Represents a detected ArUco marker
 */
export interface DetectedTag {
  /** ArUco marker ID */
  id: number;
  /** Corner points of the marker in [x,y] format, clockwise from top-left */
  corners: [number, number][];
}

/**
 * Dictionary type for 4x4 ArUco markers with 50 bits
 * As specified in the feature spec, we use the 4x4_50 dictionary (ArUco IDs 0-15)
 */
const DICT_4X4_50 = 0;

/**
 * Detects ArUco markers in an image
 * @param imageData - ImageData object containing the image to process
 * @returns Array of detected ArUco markers
 */
export const detectTags = async (imageData: ImageData): Promise<DetectedTag[]> => {
  try {
    // Load OpenCV.js on demand
    const cv = await loadOpenCV();
    
    // Convert ImageData to OpenCV Mat
    const { width, height, data } = imageData;
    const src = cv.matFromImageData(imageData);
    
    // Convert to grayscale for better detection
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Create ArUco detector with 4x4_50 dictionary
    const dictionary = new cv.aruco_Dictionary();
    cv.aruco_getPredefinedDictionary(DICT_4X4_50, dictionary);
    const parameters = new cv.aruco_DetectorParameters();
    
    // Detect markers
    const corners = new cv.MatVector();
    const ids = new cv.Mat();
    cv.aruco_detectMarkers(gray, dictionary, corners, ids, parameters);
    
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
          corners: tagCorners
        });
      }
    }
    
    // Clean up OpenCV resources
    src.delete();
    gray.delete();
    corners.delete();
    ids.delete();
    dictionary.delete();
    parameters.delete();
    
    return result;
  } catch (error) {
    console.error('ArUco detection failed:', error);
    return [];
  }
};
