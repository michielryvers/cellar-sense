// Simple import/export service using Dexie's built-in methods
import { db, deleteAllWines, addWine } from "./dexie-db";
import { exportDB, importDB } from "dexie-export-import";

/** Export the complete database as a downloadable blob */
export async function exportWinesToJSON() {
  try {
    return await exportDB(db, { prettyJson: true });
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
}

/** Import database from JSON or Blob */
export async function importWinesFromJSON(data: any) {
  try {
    // Create automatic backup of existing data
    const backupBlob = await exportDB(db);
    const url = URL.createObjectURL(backupBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cellar-sense-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Handle legacy array format
    if (Array.isArray(data)) {
      await deleteAllWines();
      for (const wine of data) {
        if (wine.images) {
          if (wine.images.front && typeof wine.images.front === "string") {
            wine.images.front = base64ToBlob(wine.images.front);
          }
          if (wine.images.back && typeof wine.images.back === "string") {
            wine.images.back = base64ToBlob(wine.images.back);
          }
        }
        delete wine.id;
        await addWine(wine);
      }
    } 
    // Handle Dexie export format
    else if (data instanceof Blob) {
      await importDB(data, { clearTablesBeforeImport: true });
    } 
    else {
      throw new Error("Invalid import data format");
    }
  } catch (error) {
    console.error("Import failed:", error);
    throw error;
  }
}

/** Convert base64 string to Blob for backward compatibility */
export function base64ToBlob(base64: string) {
  const parts = base64.split(",");
  const matches = parts[0].match(/:(.*?);/);
  const mime = matches ? matches[1] : "application/octet-stream";
  const bstr = atob(parts[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

// Export for test mocks
export { deleteAllWines, addWine };
