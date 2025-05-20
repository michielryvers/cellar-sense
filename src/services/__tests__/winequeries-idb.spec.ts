import { db, addWineQuery, wineQueriesState } from "../winequeries-idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sampleQuery = {
  query: "Find all Bordeaux",
  params: { color: "Red" },
};

describe("winequeries-idb", () => {
  beforeEach(async () => {
    await db.winequeries.clear();
  });

  afterEach(async () => {
    await db.winequeries.clear();
  });

  it("adds a wine query and updates state", async () => {
    const id = await addWineQuery(sampleQuery as any);
    expect(typeof id).toBe("number");
    const all = await db.winequeries.toArray();
    expect(all.length).toBe(1);
    expect(all[0].query).toBe("Find all Bordeaux");
  });

  it("wineQueriesState is kept in sync", async () => {
    await addWineQuery(sampleQuery as any);
    // Wait for liveQuery to update
    await new Promise((r) => setTimeout(r, 100));
    expect(wineQueriesState.value.length).toBeGreaterThan(0);
  });
});
