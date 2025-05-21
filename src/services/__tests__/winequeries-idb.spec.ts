import { db, addWineQuery, wineQueriesState } from "../dexie-db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Define test data with the correct WineQuery shape
const mockFrontImage = new Blob(["mock"], { type: "image/jpeg" });
const sampleQuery = {
  frontImage: mockFrontImage,
  backImage: null,
  bottles: 2,
  needsResize: true,
  purchaseLocation: "Test Store",
  status: "pending" as "pending", // Type assertion to satisfy literal type
};

describe("wine queries database", () => {
  beforeEach(async () => {
    await db.winequeries.clear();
  });

  afterEach(async () => {
    await db.winequeries.clear();
  });

  it("adds a wine query and updates state", async () => {
    const id = await addWineQuery(sampleQuery);
    expect(typeof id).toBe("number");
    const all = await db.winequeries.toArray();
    expect(all.length).toBe(1);
    expect(all[0].bottles).toBe(2);
    expect(all[0].purchaseLocation).toBe("Test Store");
  });

  it("wineQueriesState is kept in sync", async () => {
    await addWineQuery(sampleQuery);
    // Wait for liveQuery to update
    await new Promise((r) => setTimeout(r, 100));
    expect(wineQueriesState.value.length).toBeGreaterThan(0);
  });
});
