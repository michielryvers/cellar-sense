import Dexie, { type Table } from "dexie";
import type { Wine } from "../shared/Wine";

// Define the database
class WineventoryDB extends Dexie {
  wines!: Table<Wine, number>; // 'wines' is the table name, 'Wine' is the type of object stored, 'number' is the type of the primary key

  constructor() {
    super("cellar-sense-db"); // Database name
    this.version(1).stores({
      wines: "++id, name, vintage, color", // Primary key 'id' (auto-incremented), and an index on 'name', 'vintage', 'color'
    });
  }
}

export const db = new WineventoryDB();

/**
 * Add a new wine to the database
 * @param {Wine} wineData - The wine data to store
 * @returns {Promise<number>} The ID of the newly added wine
 */
export async function addWine(wineData: Wine): Promise<number> {
  try {
    const id = await db.wines.add(wineData);
    return id;
  } catch (error) {
    console.error("Failed to add wine:", error);
    throw error;
  }
}

/**
 * Retrieve all wines from the database
 * @returns {Promise<Wine[]>} Array of wine objects
 */
export async function getAllWines(): Promise<Wine[]> {
  try {
    const wines = await db.wines.toArray();
    return wines;
  } catch (error) {
    console.error("Failed to get all wines:", error);
    throw error;
  }
}

/**
 * Delete a wine by its ID
 * @param {number} id - The ID of the wine to delete
 * @returns {Promise<void>}
 */
export async function deleteWine(id: string | number): Promise<void> {
  try {
    await db.wines.delete(typeof id === "string" ? parseInt(id, 10) : id);
  } catch (error) {
    console.error(`Failed to delete wine with id ${id}:`, error);
    throw error;
  }
}

/**
 * Get a single wine by its ID
 * @param {number} id - The ID of the wine to retrieve
 * @returns {Promise<Wine|undefined>} The wine object if found
 */
export async function getWine(id: string | number): Promise<Wine | undefined> {
  try {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    const wine = await db.wines.get(numericId);
    return wine;
  } catch (error) {
    console.error(`Failed to get wine with id ${id}:`, error);
    throw error;
  }
}

/**
 * Update an existing wine
 * @param {Wine} wineData - The wine data to update (must include id)
 * @returns {Promise<number>} The ID of the updated wine
 */
export async function updateWine(wineData: Wine): Promise<number> {
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

/**
 * Delete all wines from the database
 * @returns {Promise<void>}
 */
export async function deleteAllWines(): Promise<void> {
  try {
    await db.wines.clear();
  } catch (error) {
    console.error("Failed to delete all wines:", error);
    throw error;
  }
}
