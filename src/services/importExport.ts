// Simple import/export service using Dexie's built-in methods
import { db } from "./dexie-db";
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

/** Import database from Blob */
export async function importWinesFromJSON(data: any) {
  try {
    // Create automatic backup of existing data
    const backupBlob = await exportDB(db);
    const url = URL.createObjectURL(backupBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cellar-sense-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Handle Dexie export format
    if (data instanceof Blob) {
      await importDB(data);
    } else {
      throw new Error("Invalid import data format - expected Blob");
    }
  } catch (error) {
    console.error("Import failed:", error);
    throw error;
  }
}
