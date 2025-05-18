import imageCompression from "browser-image-compression";

/**
 * Efficiently compress and resize an image file to base64 string
 * @param {File} file - The image file to process
 * @param {number} maxSize - Maximum width/height in pixels
 * @returns {Promise<string|null>} Base64 string of the resized image
 */
export async function resizeImageToBase64(
  file: Blob,
  maxSize: number = 1024
): Promise<string | null> {
  if (!file) return null;

  try {
    // Compression options
    const options = {
      maxSizeMB: 1, // Maximum file size in MB
      maxWidthOrHeight: maxSize, // Max width/height
      useWebWorker: true, // Use web worker for better performance
      fileType: file.type || "image/jpeg",
    };

    // Compress the image file
    const compressedFile = await imageCompression(file as File, options);

    // Convert the compressed file to base64
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error("Failed to convert image to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    return null;
  }
}

/**
 * Resize an image file and return it as a Blob
 * @param {File} file - The image file to process
 * @param {number} maxSize - Maximum width/height in pixels
 * @returns {Promise<Blob|null>} Blob of the resized image
 */
export async function resizeImageToBlob(
  file: Blob,
  maxSize: number = 1024
): Promise<Blob | null> {
  if (!file) return null;

  try {
    // Use the browser-image-compression library directly
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: maxSize,
      useWebWorker: true,
      fileType: file.type || "image/jpeg",
    };

    // This returns the compressed blob directly
    return await imageCompression(file as File, options);
  } catch (error) {
    console.error("Error compressing image to blob:", error);
    return null;
  }
}

/**
 * Create an optimized preview URL for an image file
 * @param {File} file - The image file to preview
 * @returns {Promise<string>} Data URL for the image preview
 */
export async function createImagePreview(file: Blob): Promise<string> {
  try {
    // Use smaller size for previews (300px max)
    const options = {
      maxSizeMB: 0.3, // Very small file size for previews
      maxWidthOrHeight: 300, // Small preview size
      useWebWorker: true,
      fileType: file.type || "image/jpeg",
    };

    // Compress the image for preview
    const compressedFile = await imageCompression(file as File, options);

    // Convert to data URL
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error("Failed to create preview"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error("Error creating preview:", error);
    // Fallback to original method if compression fails
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error("Failed to load image"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
