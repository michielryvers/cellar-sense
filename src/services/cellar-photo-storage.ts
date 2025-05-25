import { getAllWines, updateWine } from "./dexie-db";
import { db } from "./dexie-db";
import { resizeImageToBlob } from "../utils/imageHelpers";
import { CellarPhoto } from "../shared/types";

/**
 * Service for managing cellar photos storage and retrieval
 * Handles the reference photos used for bottle location marking
 */

/**
 * Save a new cellar photo with AprilTag detection data
 * @param imageBlob - The captured image blob
 * @param detectedTags - AprilTag detection results from camera
 * @returns Promise resolving to the created CellarPhoto
 */
export async function saveCellarPhoto(
  imageBlob: Blob,
  detectedTags: any[] = []
): Promise<CellarPhoto> {
  // Generate unique ID
  const id = crypto.randomUUID();

  // Resize image for storage efficiency (max 1920px for cellar photos)
  const resizedBlob = await resizeImageToBlob(imageBlob, 1920);

  // Get image dimensions
  const dimensions = await getImageDimensions(resizedBlob);

  const cellarPhoto: CellarPhoto = {
    id,
    blob: resizedBlob,
    width: dimensions.width,
    height: dimensions.height,
    createdAt: Date.now(),
  };

  try {
    await db.cellarPhotos.add(cellarPhoto);

    // Log detected tags for debugging
    if (detectedTags.length > 0) {
      console.info(
        `[CellarPhoto] Saved photo ${id} with ${detectedTags.length} detected tags:`,
        detectedTags.map((tag) => `ID ${tag.id}`).join(", ")
      );
    }

    return cellarPhoto;
  } catch (error) {
    console.error("[CellarPhoto] Error saving cellar photo:", error);
    throw new Error("Failed to save cellar photo");
  }
}

/**
 * Get all cellar photos sorted by creation date (newest first)
 */
export async function getAllCellarPhotos(): Promise<CellarPhoto[]> {
  try {
    return await db.cellarPhotos.orderBy("createdAt").reverse().toArray();
  } catch (error) {
    console.error("[CellarPhoto] Error retrieving cellar photos:", error);
    throw new Error("Failed to retrieve cellar photos");
  }
}

/**
 * Get a specific cellar photo by ID
 */
export async function getCellarPhoto(
  id: string
): Promise<CellarPhoto | undefined> {
  try {
    return await db.cellarPhotos.get(id);
  } catch (error) {
    console.error(`[CellarPhoto] Error retrieving cellar photo ${id}:`, error);
    throw new Error("Failed to retrieve cellar photo");
  }
}

/**
 * Delete a cellar photo by ID
 */
export async function deleteCellarPhoto(id: string): Promise<void> {
  try {
    await db.cellarPhotos.delete(id);
    console.info(`[CellarPhoto] Deleted cellar photo ${id}`);
  } catch (error) {
    console.error(`[CellarPhoto] Error deleting cellar photo ${id}:`, error);
    throw new Error("Failed to delete cellar photo");
  }
}

/**
 * Create a blob URL for displaying a cellar photo
 * Remember to revoke the URL when done: URL.revokeObjectURL(url)
 */
export function createCellarPhotoUrl(photo: CellarPhoto): string {
  return URL.createObjectURL(photo.blob);
}

/**
 * Helper function to get image dimensions from a blob
 */
function getImageDimensions(
  blob: Blob
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for dimension reading"));
    };

    img.src = url;
  });
}

/**
 * Delete all cellar photos from storage.
 */
export async function deleteAllCellarPhotos(): Promise<void> {
  const all = await db.cellarPhotos.toArray();
  for (const photo of all) {
    await db.cellarPhotos.delete(photo.id);
  }
}

/**
 * Remove all bottle location data and references to cellar photos from wines.
 */
export async function deleteAllWineLocations(): Promise<void> {
  const wines = await getAllWines();
  for (const wine of wines) {
    if (wine.location) {
      wine.location = null;
      await updateWine(wine);
    }
  }
}
