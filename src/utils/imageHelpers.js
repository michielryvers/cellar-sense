/**
 * Resize and convert an image file to base64 string
 * @param {File} file - The image file to process
 * @param {number} maxSize - Maximum width/height in pixels
 * @returns {Promise&lt;string|null&gt;} Base64 string of the resized image
 */
export async function resizeImageToBase64(file, maxSize = 1024) {
  if (!file) return null;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          const scale = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            const reader2 = new FileReader();
            reader2.onload = () => resolve(reader2.result);
            reader2.onerror = reject;
            reader2.readAsDataURL(blob);
          },
          file.type || "image/jpeg",
          0.92
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Resize an image file and return it as a Blob
 * @param {File} file - The image file to process
 * @param {number} maxSize - Maximum width/height in pixels
 * @returns {Promise&lt;Blob|null&gt;} Blob of the resized image
 */
export async function resizeImageToBlob(file, maxSize = 1024) {
  if (!file) return null;
  const base64 = await resizeImageToBase64(file, maxSize);
  if (!base64) return null;

  // Convert base64 to blob
  const response = await fetch(base64);
  return response.blob();
}

/**
 * Create a preview URL for an image file
 * @param {File} file - The image file to preview
 * @returns {Promise&lt;string&gt;} Data URL for the image preview
 */
export function createImagePreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
