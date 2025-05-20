import Dexie, { type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import type { Wine } from "../shared/Wine";
import { settingsService } from "./settings";

const DEXIE_CLOUD_URL = settingsService.dexieCloudUrl;

// Define the database

class WineventoryDB extends Dexie {
  wines!: Table<Wine, string>;

  constructor() {
    if (DEXIE_CLOUD_URL) {
      super("cellar-sense-db", { addons: [dexieCloud] });
      this.version(3).stores({
        wines: "@id, name, vintage, color",
      });
      this.cloud.configure({
        databaseUrl: DEXIE_CLOUD_URL,
        requireAuth: true,
      });
    } else {
      super("cellar-sense-db");
      this.version(3).stores({
        wines: "++id, name, vintage, color",
      });
    }
  }
}

export const db = new WineventoryDB();

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
