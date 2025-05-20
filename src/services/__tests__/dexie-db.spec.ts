import { db, addWine } from "../dexie-db";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const sampleWine = {
  id: "test-id",
  name: "Sample Wine",
  vintage: 2022,
  color: "Red",
};

describe("dexie-db", () => {
  beforeEach(async () => {
    await db.wines.clear();
  });
  afterEach(async () => {
    await db.wines.clear();
  });

  it("adds a wine to the db", async () => {
    const id = await addWine(sampleWine as any);
    expect(id).toBeDefined();
    const all = await db.wines.toArray();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe("Sample Wine");
  });
});
