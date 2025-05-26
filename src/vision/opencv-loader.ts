/**
 * OpenCV.js lazy loader
 * Ensures OpenCV is loaded only when needed to reduce initial bundle size
 */

// Define the OpenCV module type
declare global {
  interface Window {
    cv: any;
    Module?: {
      onRuntimeInitialized?: () => void;
    };
  }
}

let cvPromise: Promise<typeof window.cv> | null = null;

/**
 * Loads OpenCV.js on demand and returns a promise that resolves with the cv object
 * @returns Promise that resolves with the OpenCV module
 */
export const loadOpenCV = (): Promise<typeof window.cv> => {
  if (cvPromise) {
    return cvPromise;
  }

  cvPromise = new Promise((resolve, reject) => {
    // Check if OpenCV is already loaded
    if (window.cv) {
      resolve(window.cv);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = '/opencv.js';
    script.async = true;
    script.type = 'text/javascript';

    // Set up callbacks
    script.onload = () => {
      // OpenCV.js uses a callback to notify when it's ready
      if (window.cv) {
        // Already loaded and ready
        resolve(window.cv);
      } else {
        // Wait for cv module to be ready
        window.Module = {
          onRuntimeInitialized: () => {
            resolve(window.cv);
          }
        };
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load OpenCV.js'));
    };

    // Add script to document
    document.body.appendChild(script);
  });

  return cvPromise;
};
