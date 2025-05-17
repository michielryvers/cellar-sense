// Data import/export service for wineventory, including images
import { getAllWines, addWine, deleteAllWines } from "./db";

/**
 * Export all wine data (including images) as a downloadable JSON file
 * @returns {Promise<Blob>} JSON blob for download
 */
export async function exportWinesToJSON() {
  const wines = await getAllWines();
  // Convert any Blob images to base64 for portability
  const winesWithBase64 = await Promise.all(
    wines.map(async (wine) => {
      const images = wine.images || {};
      const out = { ...wine };
      if (images.front && images.front instanceof Blob) {
        out.images = out.images || {};
        out.images.front = await blobToBase64(images.front);
      }
      if (images.back && images.back instanceof Blob) {
        out.images = out.images || {};
        out.images.back = await blobToBase64(images.back);
      }
      return out;
    })
  );
  return new Blob([JSON.stringify(winesWithBase64, null, 2)], {
    type: "application/json",
  });
}

/**
 * Import wine data from a JSON file (including images as base64)
 * @param {Array} winesData - Array of wine objects (from JSON)
 * @returns {Promise<void>}
 */
export async function importWinesFromJSON(winesData: any) {
  // Export current data if any
  const existing = await getAllWines();
  if (existing.length > 0) {
    // Download backup before deleting
    const blob = await exportWinesToJSON();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wineventory-backup-before-import-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  // Delete all existing wines
  await deleteAllWines();
  // Import new data
  for (const wine of winesData) {
    // Convert base64 images back to Blobs if needed
    if (wine.images) {
      if (wine.images.front && typeof wine.images.front === "string") {
        wine.images.front = base64ToBlob(wine.images.front);
      }
      if (wine.images.back && typeof wine.images.back === "string") {
        wine.images.back = base64ToBlob(wine.images.back);
      }
    }
    // Remove id to avoid key conflicts; let DB assign new id
    delete wine.id;
    await addWine(wine);
  }
}

// Helpers
function blobToBase64(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string) {
  // base64 may be a data URL
  const parts = base64.split(",");
  const matches = parts[0].match(/:(.*?);/);
  const mime = matches ? matches[1] : "application/octet-stream";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
