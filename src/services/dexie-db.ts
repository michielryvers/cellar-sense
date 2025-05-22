import Dexie, { liveQuery, type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import type { Wine } from "../shared/Wine";
import { settingsService } from "./settings";
import { ref, Ref } from "vue";
import { WineQuery, WineQuestionEntry } from "../shared/types";
import { uploadDatabaseToOpenAI } from "./openai-file";
import { getOnlineStatus } from "./network-status";

const DEXIE_CLOUD_URL = settingsService.dexieCloudUrl;

// Dexie Cloud Login state for custom UI
export const showDexieLoginModal = ref(false);
export const dexieLoginTitle = ref("");
export const dexieLoginMessage = ref("");
export const dexieLoginButtonText = ref("Continue");
export const dexieLoginError = ref("");
export const dexieLoginInputPlaceholder = ref("");
export const dexieLoginCallback = ref<((value?: string) => void) | null>(null);

// Define a simple key-value table structure
interface KeyValuePair {
  key: string;
  value: string;
}

// Define the database
class WineventoryDB extends Dexie {
  wines!: Table<Wine, string>;
  winequeries!: Table<WineQuery, number>;
  winequestions!: Table<WineQuestionEntry, number>;
  filestore!: Table<KeyValuePair, string>; // New table for storing file IDs and other key-value data

  constructor() {
    if (DEXIE_CLOUD_URL) {
      super("cellar-sense-db", { addons: [dexieCloud] });
      this.version(5).stores({
        wines: "@id, name, vintage, color",
        winequeries: "@id, createdAt",
        winequestions: "@id, createdAt",
        filestore: "key", // Key-value store with key as primary key (use 'key' for both local and cloud)
      });
      this.cloud.configure({
        databaseUrl: DEXIE_CLOUD_URL,
        requireAuth: true,
        //customLoginGui: true,
      });

      // Hook into userInteraction to provide custom UI
      this.cloud.userInteraction.subscribe((event) => {
        if (!event || typeof event !== "object" || !("type" in event)) {
          console.warn("Dexie Cloud auth event: unknown event", event);
          return;
        }

        // Reset state
        dexieLoginError.value = "";
        dexieLoginInputPlaceholder.value = "";
        dexieLoginCallback.value = null;

        // Type guards for event types
        const isLogin = (
          e: any
        ): e is {
          type: "login";
          resolve: (email: string) => void;
          reject: (err: Error) => void;
        } =>
          e.type === "login" &&
          typeof e.resolve === "function" &&
          typeof e.reject === "function";
        const isVerify = (
          e: any
        ): e is { type: "verify"; email: string; resolve: () => void } =>
          e.type === "verify" &&
          typeof e.email === "string" &&
          typeof e.resolve === "function";
        const isWaitForEmail = (
          e: any
        ): e is { type: "waitForEmail"; resolve: () => void } =>
          e.type === "waitForEmail" && typeof e.resolve === "function";
        const isAccountCreated = (
          e: any
        ): e is { type: "accountCreated"; resolve: () => void } =>
          e.type === "accountCreated" && typeof e.resolve === "function";
        const isError = (
          e: any
        ): e is {
          type: "error";
          error?: { message?: string };
          resolve: () => void;
        } => e.type === "error" && typeof e.resolve === "function";
        const isEmail = (e: any): e is { type: "email"; resolve: () => void } =>
          e.type === "email" && typeof e.resolve === "function";

        if (isLogin(event)) {
          const loginEvent = event as {
            type: "login";
            resolve: (email: string) => void;
            reject: (err: Error) => void;
          };
          dexieLoginTitle.value = "Sign in to Cellar Sense";
          dexieLoginMessage.value =
            "Enter your email to sign in or create an account";
          dexieLoginButtonText.value = "Send magic link";
          dexieLoginInputPlaceholder.value = "your.email@example.com";
          dexieLoginCallback.value = (email?: string) => {
            if (email) loginEvent.resolve(email);
            else loginEvent.reject(new Error("Email is required"));
          };
          showDexieLoginModal.value = true;
        } else if (isVerify(event)) {
          const verifyEvent = event as {
            type: "verify";
            email: string;
            resolve: () => void;
          };
          dexieLoginTitle.value = "Verify your email";
          dexieLoginMessage.value = `We've sent a magic link to ${verifyEvent.email}. Click the link to sign in.`;
          dexieLoginButtonText.value = "OK";
          dexieLoginCallback.value = () => {
            verifyEvent.resolve();
          };
          showDexieLoginModal.value = true;
        } else if (isWaitForEmail(event)) {
          const waitEvent = event as {
            type: "waitForEmail";
            resolve: () => void;
          };
          dexieLoginTitle.value = "Check your inbox";
          dexieLoginMessage.value =
            "Please click the link in the email we sent you to complete the sign-in process.";
          dexieLoginButtonText.value = "OK";
          dexieLoginCallback.value = () => {
            waitEvent.resolve();
          };
          showDexieLoginModal.value = true;
        } else if (isAccountCreated(event)) {
          const accountEvent = event as {
            type: "accountCreated";
            resolve: () => void;
          };
          dexieLoginTitle.value = "Account created";
          dexieLoginMessage.value = "Your account has been created!";
          dexieLoginButtonText.value = "OK";
          dexieLoginCallback.value = () => {
            accountEvent.resolve();
          };
          showDexieLoginModal.value = true;
        } else if (isError(event)) {
          const errorEvent = event as {
            type: "error";
            error?: { message?: string };
            resolve: () => void;
          };
          dexieLoginTitle.value = "Error";
          dexieLoginMessage.value =
            errorEvent.error?.message ||
            "An error occurred during authentication";
          dexieLoginButtonText.value = "OK";
          dexieLoginError.value =
            errorEvent.error?.message || "Authentication error";
          dexieLoginCallback.value = () => {
            errorEvent.resolve();
          };
          showDexieLoginModal.value = true;
        } else if (isEmail(event)) {
          const emailEvent = event as { type: "email"; resolve: () => void };
          dexieLoginTitle.value = "Check your inbox";
          dexieLoginMessage.value =
            "Please check your email for a magic link to continue the sign-in process.";
          dexieLoginButtonText.value = "OK";
          dexieLoginCallback.value = () => {
            emailEvent.resolve();
          };
          showDexieLoginModal.value = true;
        } else {
          // Fallback for unknown event types
          console.warn("Unhandled Dexie Cloud auth event type:", event.type);
        }
      });
    } else {
      super("cellar-sense-db");
      this.version(5).stores({
        wines: "++id, name, vintage, color",
        winequeries: "++id, createdAt",
        winequestions: "++id, createdAt",
        filestore: "key", // Key-value store with key as primary key
      });
    }
  }
}

export const db = new WineventoryDB();

// Wine queries liveQuery
export const wineQueries$ = liveQuery(() => db.winequeries.toArray());

// Wine queries reactive state
export const wineQueriesState: Ref<WineQuery[]> = ref([]);

// Keep the Vue ref in sync with liveQuery
wineQueries$.subscribe((queries) => {
  wineQueriesState.value = queries;
});

// Wine questions liveQuery
export const wineQuestions$ = liveQuery(() => db.winequestions.toArray());

// Wine questions reactive state
export const wineQuestionsState: Ref<WineQuestionEntry[]> = ref([]);

// Keep the Vue ref in sync with liveQuery
wineQuestions$.subscribe((questions) => {
  wineQuestionsState.value = questions;
});

// WINE METHODS

export async function addWine(wineData: Wine): Promise<string> {
  try {
    const id = await db.wines.add(wineData);

    // After adding wine, upload database to OpenAI if online and API key available
    if (getOnlineStatus() && settingsService.hasOpenAiKey()) {
      try {
        // Non-blocking upload to avoid delaying UI
        uploadDatabaseToOpenAI().catch((err) => {
          console.warn("Background database upload failed:", err);
        });
      } catch (uploadError) {
        // Non-fatal, just log
        console.warn("Failed to upload database to OpenAI:", uploadError);
      }
    }

    return id;
  } catch (error) {
    console.error("Failed to add wine:", error);
    throw error;
  }
}

export async function getAllWines(): Promise<Wine[]> {
  try {
    const wines = await db.wines.toArray();
    return wines;
  } catch (error) {
    console.error("Failed to get all wines:", error);
    throw error;
  }
}

export async function deleteWine(id: string): Promise<void> {
  try {
    await db.wines.delete(id);
  } catch (error) {
    console.error(`Failed to delete wine with id ${id}:`, error);
    throw error;
  }
}

export async function getWine(id: string): Promise<Wine | undefined> {
  try {
    const wine = await db.wines.get(id);
    return wine;
  } catch (error) {
    console.error(`Failed to get wine with id ${id}:`, error);
    throw error;
  }
}

export async function updateWine(wineData: Wine): Promise<string> {
  if (wineData.id === undefined) {
    throw new Error("Wine data must include an id to be updated.");
  }
  try {
    // Dexie's put method updates if exists, or adds if not.
    // It returns the key of the updated/added item.
    const id = await db.wines.put(wineData);

    // After updating wine, upload database to OpenAI if online and API key available
    if (getOnlineStatus() && settingsService.hasOpenAiKey()) {
      try {
        // Non-blocking upload to avoid delaying UI
        uploadDatabaseToOpenAI().catch((err) => {
          console.warn("Background database upload failed:", err);
        });
      } catch (uploadError) {
        // Non-fatal, just log
        console.warn("Failed to upload database to OpenAI:", uploadError);
      }
    }

    return id;
  } catch (error) {
    console.error(`Failed to update wine with id ${wineData.id}:`, error);
    throw error;
  }
}

export async function deleteAllWines(): Promise<void> {
  try {
    await db.wines.clear();
  } catch (error) {
    console.error("Failed to delete all wines:", error);
    throw error;
  }
}

export async function drinkBottle(
  id: string,
  consumption?: { rating: number; notes: string }
): Promise<number | undefined> {
  const wine = await db.wines.get(id);
  if (!wine) return undefined;
  if (!wine.inventory) {
    wine.inventory = { bottles: 0, purchaseDate: "", purchaseLocation: "" };
  }
  if (wine.inventory.bottles > 0) {
    wine.inventory.bottles--;

    // If consumption details are provided, add them to the wine's consumptions array
    if (consumption) {
      if (!wine.consumptions) {
        wine.consumptions = [];
      }
      wine.consumptions.push({
        date: new Date().toISOString(),
        rating: consumption.rating,
        notes: consumption.notes,
      });
    }

    if (wine.id !== undefined) {
      await db.wines.update(wine.id, {
        "inventory.bottles": wine.inventory.bottles,
        consumptions: wine.consumptions || [],
      });

      // After updating wine, upload database to OpenAI if online and API key available
      if (getOnlineStatus() && settingsService.hasOpenAiKey()) {
        try {
          // Non-blocking upload to avoid delaying UI
          uploadDatabaseToOpenAI().catch((err) => {
            console.warn("Background database upload failed:", err);
          });
        } catch (uploadError) {
          // Non-fatal, just log
          console.warn("Failed to upload database to OpenAI:", uploadError);
        }
      }
    }
    return wine.inventory.bottles;
  }
  return wine.inventory.bottles;
}

/**
 * Get all distinct purchase locations from the database
 * @returns Array of unique purchase locations
 */
export async function getDistinctPurchaseLocations(): Promise<string[]> {
  try {
    const wines = await db.wines.toArray();
    const locations = new Set<string>();

    // Collect all non-empty purchase locations
    wines.forEach((wine) => {
      if (
        wine.inventory?.purchaseLocation &&
        wine.inventory.purchaseLocation.trim() !== ""
      ) {
        locations.add(wine.inventory.purchaseLocation.trim());
      }
    });

    return Array.from(locations).sort();
  } catch (error) {
    console.error("Failed to get distinct purchase locations:", error);
    return [];
  }
}

// FILE STORAGE METHODS

/**
 * Get a value from the filestore table by key
 * @param key The key to get the value for
 * @returns The value for the key or null if not found
 */
export async function getFilestoreValue(key: string): Promise<string | null> {
  try {
    const entry = await db.filestore.get(key);
    return entry?.value || null;
  } catch (error) {
    console.error(`Failed to get filestore value for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in the filestore table
 * @param key The key to set the value for
 * @param value The value to set
 */
export async function setFilestoreValue(
  key: string,
  value: string
): Promise<void> {
  try {
    await db.filestore.put({ key, value });
  } catch (error) {
    console.error(`Failed to set filestore value for key ${key}:`, error);
    throw error;
  }
}

// Constants for filestore keys
export const OPENAI_FILE_ID_KEY = "OPENAI_WINE_FILE_ID";

// WINE QUERY METHODS

export async function addWineQuery(query: Omit<WineQuery, "id" | "createdAt">) {
  console.time("Dexie ‑ addWineQuery"); // ⏱ start
  try {
    const id = await db.winequeries.add({
      ...query,
      createdAt: Date.now(),
    });
    console.timeEnd("Dexie ‑ addWineQuery"); // ⏱ stop
    return id;
  } catch (error) {
    console.timeEnd("Dexie ‑ addWineQuery"); // ensure timer ends on error
    console.error("Failed to add wine query:", error);
    throw error;
  }
}

export async function getAllWineQueries(): Promise<WineQuery[]> {
  try {
    return await db.winequeries.toArray();
  } catch (error) {
    console.error("Failed to get all wine queries:", error);
    throw error;
  }
}

export async function deleteWineQuery(id: number): Promise<void> {
  try {
    await db.winequeries.delete(id);
  } catch (error) {
    console.error(`Failed to delete wine query with id ${id}:`, error);
    throw error;
  }
}

export async function getNextWineQuery(): Promise<WineQuery | undefined> {
  try {
    // Get the first item ordered by createdAt
    const query = await db.winequeries.orderBy("createdAt").first();
    return query;
  } catch (error) {
    console.error("Failed to get next wine query:", error);
    throw error;
  }
}

// WINE QUESTION METHODS

/**
 * Save a question and its response to the database
 * @param question The user's question
 * @param response The AI's response
 * @returns The ID of the saved question
 */
export async function saveWineQuestion(
  question: string,
  response: string
): Promise<number> {
  console.time("Dexie ‑ saveWineQuestion");
  try {
    const id = await db.winequestions.add({
      question,
      response,
      createdAt: Date.now(),
    });
    console.timeEnd("Dexie ‑ saveWineQuestion");
    return id;
  } catch (error) {
    console.timeEnd("Dexie ‑ saveWineQuestion"); // ensure timer ends on error
    console.error("Failed to save wine question:", error);
    throw error;
  }
}

/**
 * Get all wine questions from the database, sorted by creation time (newest first)
 * @returns An array of wine questions
 */
export async function getAllWineQuestions(): Promise<WineQuestionEntry[]> {
  try {
    return await db.winequestions.orderBy("createdAt").reverse().toArray();
  } catch (error) {
    console.error("Failed to get wine questions:", error);
    throw error;
  }
}

/**
 * Delete a wine question from the database
 * @param id The ID of the question to delete
 */
export async function deleteWineQuestion(id: number): Promise<void> {
  try {
    await db.winequestions.delete(id);
  } catch (error) {
    console.error(`Failed to delete wine question with id ${id}:`, error);
    throw error;
  }
}

/**
 * Get a wine question by its ID
 * @param id The ID of the question to retrieve
 * @returns The question, or undefined if not found
 */
export async function getWineQuestionById(
  id: number
): Promise<WineQuestionEntry | undefined> {
  try {
    return await db.winequestions.get(id);
  } catch (error) {
    console.error(`Failed to get wine question with id ${id}:`, error);
    throw error;
  }
}
