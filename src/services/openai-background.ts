// src/services/openai-background.ts
// Background processor for OpenAI wine queries
import { extractWineData } from "./openai";
import { addWine } from "./dexie-db";
import { getNextWineQuery, deleteWineQuery } from "./winequeries-idb";
import { getOnlineStatus } from "./network-status";
import { Wine } from "../shared/Wine";
import { BehaviorSubject } from "rxjs";

let isProcessing = false;

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
    ) as Wine;

    // Add inventory info
    wineData.inventory = {
      bottles: query.bottles,
      purchaseDate: new Date().toISOString(),
      purchaseLocation: query.purchaseLocation || "",
    };
    // Images are not available here, user must attach manually if needed
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
