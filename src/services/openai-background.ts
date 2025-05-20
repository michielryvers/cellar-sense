// src/services/openai-background.ts
// Background processor for OpenAI wine queries
import { extractWineData } from "./openai";
import { addWine } from "./dexie-db";
import { getNextWineQuery, deleteWineQuery, db } from "./winequeries-idb";
import { getOnlineStatus } from "./network-status";
import { Wine } from "../shared/Wine";
import { BehaviorSubject } from "rxjs";
import { resizeImageToBlob } from "../utils/imageHelpers";
import { settingsService } from "./settings";

let isProcessing = false;

/**
 * Convert a Blob/File to a base64 data-URL string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function base64ToBlob(base64: string): Promise<Blob> {
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
  hasApiKey: settingsService.hasOpenAiKey(),
});

export async function processNextWineQuery() {
  if (isProcessing) return;

  // Check if we're online
  const isOnline = getOnlineStatus();
  // Check if we have API key
  const apiKey = settingsService.openAiKey;
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

    if (query.needsResize) {
      query.frontImage = await resizeImageToBlob(query.frontImage);
      if (query.backImage) {
        query.backImage = await resizeImageToBlob(query.backImage);
      }
      query.needsResize = false;
      if (query.id !== undefined) {
        await db.winequeries.update(query.id, {
          frontImage: query.frontImage,
          backImage: query.backImage,
          needsResize: false,
        });
      }
    }

    // Prepare data for OpenAI – support both legacy (base64) and new (Blob) formats
    const frontBase64 =
      "frontImage" in query
        ? await blobToBase64(query.frontImage as Blob)
        : (query as any).frontBase64;

    const backBase64 =
      "backImage" in query && query.backImage
        ? await blobToBase64(query.backImage as Blob)
        : (query as any).backBase64 || null;

    // Call OpenAI
    const extractedData = await extractWineData({
      apiKey,
      purchaseLocation: query.purchaseLocation,
      frontBase64,
      backBase64,
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

    // Attach original images (prefer blobs; fall back to converting base64)
    try {
      const images: Record<string, Blob | null> = {};

      if ("frontImage" in query) {
        images.front = query.frontImage;
      } else if ((query as any).frontBase64) {
        images.front = await base64ToBlob((query as any).frontBase64);
      }

      if ("backImage" in query && query.backImage) {
        images.back = query.backImage;
      } else if ((query as any).backBase64) {
        images.back = await base64ToBlob((query as any).backBase64);
      }

      wineData.images = { ...wineData.images, ...images };
    } catch (imageErr) {
      console.error("Error attaching images:", imageErr);
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
      hasApiKey: settingsService.hasOpenAiKey(),
    });
  }
}

// Poll every N seconds, checking network status each time
// But ensure we don't overlap executions
let pollingTimeout: number | null = null;

async function scheduleNextPoll(intervalMs = 5000) {
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
  }

  pollingTimeout = window.setTimeout(async () => {
    await processNextWineQuery();
    scheduleNextPoll(intervalMs);
  }, intervalMs);
}

export function startWineQueryPolling(intervalMs = 5000) {
  // Start the first poll
  scheduleNextPoll(intervalMs);
}
