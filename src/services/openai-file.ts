// src/services/openai-file.ts
// Service for managing OpenAI file uploads
import { OpenAI } from "openai";
import { BehaviorSubject } from "rxjs";
import { getAllWines, getFilestoreValue, setFilestoreValue, OPENAI_FILE_ID_KEY } from "./dexie-db";
import { getOnlineStatus } from "./network-status";
import { settingsService } from "./settings";

// BehaviorSubject to track current file ID
export const fileId$ = new BehaviorSubject<string | null>(null);

/**
 * Store the OpenAI file ID in the database
 * @param fileId The file ID to store
 */
export async function storeFileId(fileId: string): Promise<void> {
  await setFilestoreValue(OPENAI_FILE_ID_KEY, fileId);
  fileId$.next(fileId);
}

/**
 * Get the stored OpenAI file ID from the database
 * @returns The stored file ID or null if not found
 */
export async function getStoredFileId(): Promise<string | null> {
  return await getFilestoreValue(OPENAI_FILE_ID_KEY);
}

/**
 * Creates a JSON blob from the database content
 * @returns A JSON blob containing all wines
 */
export async function createDatabaseExport(): Promise<Blob> {
  const wines = await getAllWines();
  
  // Create a simplified version without binary data
  const winesForExport = wines.map((wine) => ({
    id: wine.id,
    name: wine.name,
    vintner: wine.vintner,
    vintage: wine.vintage,
    appellation: wine.appellation,
    region: wine.region,
    color: wine.color,
    volume: wine.volume,
    alcohol: wine.alcohol,
    farming: wine.farming,
    price: wine.price,
    sulfites: wine.sulfites,
    drink_from: wine.drink_from,
    drink_until: wine.drink_until,
    grapes: wine.grapes,
    vinification: wine.vinification,
    tasting_notes: wine.tasting_notes,
    inventory: wine.inventory,
    consumptions: wine.consumptions,
  }));

  return new Blob([JSON.stringify(winesForExport, null, 2)], {
    type: "application/json",
  });
}

/**
 * Deletes a file from OpenAI
 * @param fileId The ID of the file to delete
 * @returns True if delete was successful
 */
export async function deleteOpenAIFile(fileId: string): Promise<boolean> {
  if (!getOnlineStatus()) {
    console.warn("Cannot delete OpenAI file while offline");
    return false;
  }

  const apiKey = settingsService.openAiKey;
  if (!apiKey) {
    console.warn("OpenAI API key is required to delete file");
    return false;
  }

  try {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    await openai.files.del(fileId);
    return true;
  } catch (error) {
    console.error("Failed to delete OpenAI file:", error);
    return false;
  }
}

/**
 * Uploads the database to OpenAI as a file
 * @returns The file ID if successful, null otherwise
 */
export async function uploadDatabaseToOpenAI(): Promise<string | null> {
  // Check if we're online
  if (!getOnlineStatus()) {
    console.warn("Cannot upload database to OpenAI while offline");
    return null;
  }

  const apiKey = settingsService.openAiKey;
  if (!apiKey) {
    console.warn("OpenAI API key is required to upload database");
    return null;
  }

  try {
    // Create JSON export
    const jsonBlob = await createDatabaseExport();
    
    // Convert blob to File object
    const file = new File([jsonBlob], "cellar-sense-wines.json", {
      type: "application/json",
    });

    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    
    // Delete previous file if exists
    const existingFileId = await getStoredFileId();
    if (existingFileId) {
      try {
        await openai.files.del(existingFileId);
      } catch (error) {
        // Non-fatal, just log the error
        console.warn("Failed to delete previous file, continuing with upload", error);
      }
    }
    
    // Upload new file
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants",
    });
    
    // Store the new file ID
    await storeFileId(uploadedFile.id);
    
    return uploadedFile.id;
  } catch (error) {
    console.error("Failed to upload database to OpenAI:", error);
    return null;
  }
}

/**
 * Ensures database is uploaded to OpenAI
 * Uses cached file ID if available and valid
 * @returns The file ID to use with API calls
 */
export async function ensureDatabaseUploaded(): Promise<string | null> {
  // If we're offline, use cached file ID
  if (!getOnlineStatus()) {
    return await getStoredFileId();
  }

  // Try to upload
  return await uploadDatabaseToOpenAI();
}