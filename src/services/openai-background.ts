// src/services/openai-background.ts
// Background processor for OpenAI wine queries
import { extractWineData } from "./openai";
import { addWine } from "./dexie-db";
import { getNextWineQuery, deleteWineQuery } from "./winequeries-idb";
import { getOnlineStatus } from "./network-status";
import { Wine } from "../shared/Wine";
import { BehaviorSubject } from "rxjs";

let isProcessing = false;

/**
 * Convert a base64 string to a Blob
 * @param base64 The base64 string to convert
 * @returns A Blob representation of the base64 string
 */
async function base64ToBlob(base64: string): Promise<Blob> {
  // Check if this is a data URL and extract the actual base64 part
  if (base64.startsWith("data:")) {
    const parts = base64.split(",");
    if (parts.length === 2) {
      base64 = parts[1];
    }
  }

  // Convert base64 to Blob using fetch API
  const response = await fetch(`data:image/jpeg;base64,${base64}`);
  return response.blob();
}

// Observable for processing status
export const processingStatus$ = new BehaviorSubject<{
  isRunning: boolean;
  isOnline: boolean;
  hasApiKey: boolean;
}>({
  isRunning: false,
  isOnline: navigator.onLine,
  hasApiKey: !!localStorage.getItem("OPENAI_SDK_KEY"),
});

export async function processNextWineQuery() {
  if (isProcessing) return;

  // Check if we're online
  const isOnline = getOnlineStatus();
  // Check if we have API key
  const apiKey = localStorage.getItem("OPENAI_SDK_KEY") || "";
  const hasApiKey = !!apiKey;

  // Update processing status
  processingStatus$.next({
    isRunning: isProcessing,
    isOnline,
    hasApiKey,
  });

  // Skip processing if offline or no API key
  if (!isOnline || !hasApiKey) {
    return;
  }

  isProcessing = true;
  processingStatus$.next({
    isRunning: true,
    isOnline,
    hasApiKey,
  });

  try {
    const query = await getNextWineQuery();
    if (!query) {
      isProcessing = false;
      processingStatus$.next({
        isRunning: false,
        isOnline,
        hasApiKey,
      });
      return;
    }

    // Call OpenAI
    const extractedData = await extractWineData({
      apiKey,
      purchaseLocation: query.purchaseLocation,
      frontBase64: query.frontBase64,
      backBase64: query.backBase64,
    });

    // Parse the extracted data as Wine type
    const wineData = (
      typeof extractedData === "string"
        ? JSON.parse(extractedData)
        : extractedData
    ) as Wine; // Add inventory info
    wineData.inventory = {
      bottles: query.bottles,
      purchaseDate: new Date().toISOString(),
      purchaseLocation: query.purchaseLocation || "",
    };

    // Convert base64 images to blobs and add them to the wine data
    try {
      // For front image (required)
      if (query.frontBase64) {
        const frontBlob = await base64ToBlob(query.frontBase64);
        wineData.images = {
          ...wineData.images,
          front: frontBlob,
        };
      }

      // For back image (optional)
      if (query.backBase64) {
        const backBlob = await base64ToBlob(query.backBase64);
        wineData.images = {
          ...wineData.images,
          back: backBlob,
        };
      }
    } catch (imageErr) {
      console.error("Error converting images to blobs:", imageErr);
      // If conversion fails, ensure we at least have a valid images object
      wineData.images = wineData.images || { front: null };
    }

    await addWine(wineData);
    await deleteWineQuery(query.id!);
  } catch (err) {
    console.error("Error processing wine query:", err);
    // Optionally: log or handle error
    // Could implement retry or error queue
    // For now, just skip
  } finally {
    isProcessing = false;
    processingStatus$.next({
      isRunning: false,
      isOnline: getOnlineStatus(),
      hasApiKey: !!localStorage.getItem("OPENAI_SDK_KEY"),
    });
  }
}

// Poll every N seconds, checking network status each time
export function startWineQueryPolling(intervalMs = 5000) {
  setInterval(() => {
    processNextWineQuery();
  }, intervalMs);
}
