// src/services/winequeries-idb.ts
// IndexedDB wrapper for winequeries table using idb
import { openDB, DBSchema } from "idb";
import { BehaviorSubject, Observable } from "rxjs";
import { ref, Ref } from "vue";

interface WineQuery {
  id?: number;
  frontBase64: string;
  backBase64: string | null;
  purchaseLocation?: string;
  bottles: number;
  createdAt: number;
}

interface WineQueryDB extends DBSchema {
  winequeries: {
    key: number;
    value: WineQuery;
    indexes: { createdAt: number };
  };
}

const DB_NAME = "cellar-sense-queries";
const DB_VERSION = 1;

// RxJS Observable for wine queries
const wineQueriesSubject = new BehaviorSubject<WineQuery[]>([]);
export const wineQueries$: Observable<WineQuery[]> =
  wineQueriesSubject.asObservable();

// For backward compatibility - create a Vue reactive state that stays in sync with RxJS
export const wineQueriesState: Ref<WineQuery[]> = ref([]);

// Keep the Vue ref in sync with the RxJS subject
wineQueriesSubject.subscribe((queries) => {
  wineQueriesState.value = queries;
});

// Initialize the observable
let initialized = false;

async function initializeObservable() {
  if (initialized) return;

  const queries = await getAllWineQueriesInternal();
  wineQueriesSubject.next(queries);
  initialized = true;
}

// Internal function to get all queries
async function getAllWineQueriesInternal() {
  const db = await getWineQueryDB();
  return db.getAll("winequeries");
}

export async function getWineQueryDB() {
  return openDB<WineQueryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("winequeries")) {
        const store = db.createObjectStore("winequeries", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt");
      }
    },
  });
}

export async function addWineQuery(query: Omit<WineQuery, "id" | "createdAt">) {
  const db = await getWineQueryDB();
  const id = await db.add("winequeries", { ...query, createdAt: Date.now() });

  // Update the observable state
  const queries = await getAllWineQueriesInternal();
  wineQueriesSubject.next(queries);

  return id;
}

export async function getAllWineQueries() {
  // Initialize if needed
  if (!initialized) {
    await initializeObservable();
  }
  return wineQueriesSubject.value;
}

export async function deleteWineQuery(id: number) {
  const db = await getWineQueryDB();
  await db.delete("winequeries", id);

  // Update the observable state
  const queries = await getAllWineQueriesInternal();
  wineQueriesSubject.next(queries);
}

export async function getNextWineQuery(): Promise<WineQuery | undefined> {
  const db = await getWineQueryDB();
  const tx = db.transaction("winequeries", "readonly");
  const store = tx.objectStore("winequeries");
  const index = store.index("createdAt");
  const cursor = await index.openCursor();
  return cursor?.value;
}
