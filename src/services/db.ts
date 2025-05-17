import { openDB } from "idb";

const DB_NAME = "wineventory-db";
const DB_VERSION = 1;
const STORE_NAME = "wines";

async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
  return db;
}

/**
 * Add a new wine to the database
 * @param {Object} wineData - The wine data to store
 * @returns {Promise<number>} The ID of the newly added wine
 */
export async function addWine(wineData: any) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const id = await store.add(wineData);
  await tx.done;
  return id;
}

/**
 * Retrieve all wines from the database
 * @returns {Promise<Array>} Array of wine objects
 */
export async function getAllWines() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const wines = await store.getAll();
  await tx.done;
  return wines;
}

/**
 * Delete a wine by its ID
 * @param {number} id - The ID of the wine to delete
 * @returns {Promise<void>}
 */
export async function deleteWine(id: IDBValidKey | IDBKeyRange) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.objectStore(STORE_NAME).delete(id);
  await tx.done;
}

/**
 * Get a single wine by its ID
 * @param {number} id - The ID of the wine to retrieve
 * @returns {Promise<Object|undefined>} The wine object if found
 */
export async function getWine(id: IDBValidKey | IDBKeyRange) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const wine = await tx.objectStore(STORE_NAME).get(id);
  await tx.done;
  return wine;
}

/**
 * Update an existing wine
 * @param {Object} wineData - The wine data to update (must include id)
 * @returns {Promise<Object>} The updated wine data
 */
export async function updateWine(wineData: any) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.put(wineData);
  await tx.done;
  return wineData;
}
/**
 * Delete all wines from the database
 * @returns {Promise<void>}
 */
export async function deleteAllWines() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
}
