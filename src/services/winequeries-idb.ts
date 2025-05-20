import Dexie, { liveQuery, type Table } from "dexie";
import { ref, Ref } from "vue";
import { WineQuery } from "../shared/types";

class WineQueryDB extends Dexie {
  winequeries!: Table<WineQuery, number>;

  constructor() {
    super("cellar-sense-queries");
    this.version(1).stores({
      winequeries: "++id, createdAt",
    });
  }
}

export const db = new WineQueryDB();

// Use Dexie's liveQuery instead of RxJS BehaviorSubject
export const wineQueries$ = liveQuery(() => db.winequeries.toArray());

// For backward compatibility - create a Vue reactive state that stays in sync with liveQuery
export const wineQueriesState: Ref<WineQuery[]> = ref([]);

// Keep the Vue ref in sync with liveQuery
wineQueries$.subscribe((queries) => {
  wineQueriesState.value = queries;
});

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
