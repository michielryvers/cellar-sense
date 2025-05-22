// Data import/export service for wineventory, using Dexie's built-in export/import
import { db, getAllWines, addWine, deleteAllWines } from "./dexie-db";
import { exportDB, importDB } from "dexie-export-import";

/**
 * Export all wine data (including images) as a downloadable JSON file
 * @returns {Promise<Blob>} JSON blob for download
 */
export async function exportWinesToJSON() {
  try {
    // Use Dexie's built-in exportDB method with pretty formatting
    return await exportDB(db, {
      prettyJson: true,
      // We're only interested in exporting the wines table
      filter: (tableName) => tableName === "wines",
    });
  } catch (error) {
    console.error("Failed to export database:", error);
    throw error;
  }
}

/**
 * Import wine data from a JSON file or Blob
 * @param {Array|Blob} data - Array of wine objects (from JSON) or Blob from exportDB
 * @returns {Promise<void>}
 */
export async function importWinesFromJSON(data: any) {
  try {
    // Export current data if any for backup
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

    // If data is an array (legacy format), create a compatible Blob
    if (Array.isArray(data)) {
      // First, convert any string images to Blobs
      for (const wine of data) {
        if (wine.images) {
          if (wine.images.front && typeof wine.images.front === "string") {
            wine.images.front = base64ToBlob(wine.images.front);
          }
          if (wine.images.back && typeof wine.images.back === "string") {
            wine.images.back = base64ToBlob(wine.images.back);
          }
        }
        // Remove id to avoid key conflicts
        delete wine.id;
      }

      // Delete existing data
      await deleteAllWines();
      
      // Add each wine individually for legacy array format
      for (const wine of data) {
        await addWine(wine);
      }
    } else if (data instanceof Blob) {
      // Delete existing data
      await deleteAllWines();

      // Use Dexie's built-in importDB method for Blobs
      await importDB(data, {
        // We're only interested in the wines table
        filter: (tableName) => tableName === "wines",
        // Clear existing data
        clearTablesBeforeImport: true,
      });
    } else {
      throw new Error("Invalid import data format");
    }
  } catch (error) {
    console.error("Failed to import database:", error);
    throw error;
  }
}

// Helpers for backward compatibility
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string) {
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

// Export for test mocks
export { getAllWines, addWine, deleteAllWines };
