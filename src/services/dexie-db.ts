import Dexie, { liveQuery, type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import type { Wine } from "../shared/Wine";
import type { RackDefinition, WineLocation } from "../shared/types/vision";
import { settingsService } from "./settings";
import { ref, Ref } from "vue";
import {
  RecommendationHistoryEntry,
  RecommendationOption,
  WineQuery,
  WineQuestionEntry,
} from "../shared/types";

const DEXIE_CLOUD_URL = settingsService.dexieCloudUrl;

// Define the database
class WineventoryDB extends Dexie {
  wines!: Table<Wine, string>;
  winequeries!: Table<WineQuery, number>;
  winequestions!: Table<WineQuestionEntry, number>;
  recommendations!: Table<RecommendationHistoryEntry, number>;
  cellarVisionDefinition!: Table<RackDefinition, string>;

  constructor() {
    if (DEXIE_CLOUD_URL) {
      super("cellar-sense-db", { addons: [dexieCloud] });
      this.version(5).stores({
        wines: "@id, name, vintage, color",
        winequeries: "@id, createdAt",
        winequestions: "@id, createdAt",
        recommendations: "@id, createdAt",
      });
      // Added version 6 to make migration to 7 idempotent
      this.version(6).stores({
        wines: "@id, name, vintage, color", // existing fields + location
        winequeries: "@id, createdAt",
        winequestions: "@id, createdAt",
        recommendations: "@id, createdAt",
      });
      this.version(7).stores({
        wines: "@id, name, vintage, color, location.rackId", // existing fields + location
        cellarVisionDefinition: "&id, rackName", // new table
        winequeries: "@id, createdAt",
        winequestions: "@id, createdAt",
        recommendations: "@id, createdAt",
      });
      this.cloud.configure({
        databaseUrl: DEXIE_CLOUD_URL,
        requireAuth: true,
        customLoginGui: true,
      });
    } else {
      super("cellar-sense-db");
      this.version(5).stores({
        wines: "++id, name, vintage, color",
        winequeries: "++id, createdAt",
        winequestions: "++id, createdAt",
        recommendations: "++id, createdAt",
      });
      // Added version 6 to make migration to 7 idempotent
      this.version(6).stores({
        wines: "++id, name, vintage, color", // existing fields + location
        winequeries: "++id, createdAt",
        winequestions: "++id, createdAt",
        recommendations: "++id, createdAt",
      });
      this.version(7).stores({
        wines: "++id, name, vintage, color, location.rackId", // existing fields + location
        cellarVisionDefinition: "&id, rackName", // new table
        winequeries: "++id, createdAt",
        winequestions: "++id, createdAt",
        recommendations: "++id, createdAt",
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

// Recommendations methods (outside class)
export async function saveRecommendation(
  query: string,
  results: RecommendationOption[]
): Promise<number> {
  return db.recommendations.add({
    query,
    results,
    createdAt: Date.now(),
  });
}

export async function getAllRecommendations(): Promise<
  RecommendationHistoryEntry[]
> {
  return db.recommendations.orderBy("createdAt").reverse().toArray();
}

export async function getRecommendationById(
  id: number
): Promise<RecommendationHistoryEntry | undefined> {
  return db.recommendations.get(id);
}

// VISION METHODS

export async function saveRack(def: RackDefinition): Promise<string> {
  try {
    const id = await db.cellarVisionDefinition.put(def);
    return id;
  } catch (error) {
    console.error("Failed to save rack definition:", error);
    throw error;
  }
}

export async function getRack(id: string): Promise<RackDefinition | undefined> {
  try {
    const rack = await db.cellarVisionDefinition.get(id);
    return rack;
  } catch (error) {
    console.error(`Failed to get rack definition with id ${id}:`, error);
    throw error;
  }
}

export async function saveWineLocation(
  wineId: string,
  location: WineLocation
): Promise<number> {
  try {
    // Using a function-based update to modify nested properties
    const result = await db.wines.update(wineId, (wine) => {
      wine.location = {
        rackId: location.rackId,
        x: location.x,
        y: location.y,
      };
    });
    return result;
  } catch (error) {
    console.error(`Failed to save location for wine with id ${wineId}:`, error);
    throw error;
  }
}
