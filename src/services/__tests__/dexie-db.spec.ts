import { db, addWine, getWine, updateWine, deleteWine } from "../dexie-db";
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

  it("retrieves a wine by id", async () => {
    const id = await addWine(sampleWine as any);
    const wine = await getWine(id);
    expect(wine).toBeDefined();
    expect(wine?.name).toBe("Sample Wine");
  });

  it("updates a wine in the db", async () => {
    const id = await addWine(sampleWine as any);
    const updatedWine = {
      ...sampleWine,
      id,
      name: "Updated Wine",
      vintner: "Updated Vintner",
      appellation: "Updated Appellation",
      region: "Updated Region",
      volume: "750 ml",
      alcohol: "14% Vol",
      farming: "Organic",
      price: "€12.00",
      sulfites: "Low-sulfite",
      drink_from: 2025,
      drink_until: 2030,
      grapes: [],
      vinification: [],
      tasting_notes: { nose: [], palate: [] },
      images: { front: "", back: "" },
      inventory: {
        bottles: 1,
        purchaseDate: "2025-05-22",
        purchaseLocation: "Test Store",
      },
    };
    await updateWine(updatedWine);
    const wine = await getWine(id);
    expect(wine?.name).toBe("Updated Wine");
  });

  it("deletes a wine from the db", async () => {
    const id = await addWine(sampleWine as any);
    await deleteWine(id);
    const wine = await getWine(id);
    expect(wine).toBeUndefined();
  });

  it("gets all wines from the db", async () => {
    await addWine({ ...sampleWine, id: "id1", name: "Wine 1" } as any);
    await addWine({ ...sampleWine, id: "id2", name: "Wine 2" } as any);
    const wines = await db.wines.toArray();
    expect(wines.length).toBe(2);
    expect(wines.map((w) => w.name)).toContain("Wine 1");
    expect(wines.map((w) => w.name)).toContain("Wine 2");
  });

  it("deletes all wines from the db", async () => {
    await addWine({ ...sampleWine, id: "id1" } as any);
    await addWine({ ...sampleWine, id: "id2" } as any);
    await db.wines.clear();
    const wines = await db.wines.toArray();
    expect(wines.length).toBe(0);
  });

  it("decrements bottle count and adds consumption on drinkBottle", async () => {
    const wineData = {
      ...sampleWine,
      id: "drink-id",
      inventory: {
        bottles: 2,
        purchaseDate: "2025-05-22",
        purchaseLocation: "Test Store",
      },
      consumptions: [],
      vintner: "Vintner",
      appellation: "Appellation",
      region: "Region",
      volume: "750 ml",
      alcohol: "14% Vol",
      farming: "Organic",
      price: "€10.00",
      sulfites: "Low-sulfite",
      drink_from: 2025,
      drink_until: 2030,
      grapes: [],
      vinification: [],
      tasting_notes: { nose: [], palate: [] },
      images: { front: "", back: "" },
    };
    await addWine(wineData as any);
    const { drinkBottle } = await import("../dexie-db");
    const bottlesLeft = await drinkBottle("drink-id", {
      rating: 5,
      notes: "Great!",
    });
    expect(bottlesLeft).toBe(1);
    const wine = await getWine("drink-id");
    expect(wine?.inventory.bottles).toBe(1);
    expect(wine?.consumptions?.length).toBe(1);
    expect(wine?.consumptions?.[0].rating).toBe(5);
    expect(wine?.consumptions?.[0].notes).toBe("Great!");
  });

  it("gets distinct purchase locations", async () => {
    await addWine({
      ...sampleWine,
      id: "id1",
      inventory: {
        bottles: 1,
        purchaseDate: "2025-05-22",
        purchaseLocation: "Store A",
      },
      vintner: "V",
      appellation: "A",
      region: "R",
      volume: "750 ml",
      alcohol: "14% Vol",
      farming: "O",
      price: "€10",
      sulfites: "Low",
      drink_from: 2025,
      drink_until: 2030,
      grapes: [],
      vinification: [],
      tasting_notes: { nose: [], palate: [] },
      images: { front: "", back: "" },
    } as any);
    await addWine({
      ...sampleWine,
      id: "id2",
      inventory: {
        bottles: 1,
        purchaseDate: "2025-05-22",
        purchaseLocation: "Store B",
      },
      vintner: "V",
      appellation: "A",
      region: "R",
      volume: "750 ml",
      alcohol: "14% Vol",
      farming: "O",
      price: "€10",
      sulfites: "Low",
      drink_from: 2025,
      drink_until: 2030,
      grapes: [],
      vinification: [],
      tasting_notes: { nose: [], palate: [] },
      images: { front: "", back: "" },
    } as any);
    await addWine({
      ...sampleWine,
      id: "id3",
      inventory: {
        bottles: 1,
        purchaseDate: "2025-05-22",
        purchaseLocation: "Store A",
      },
      vintner: "V",
      appellation: "A",
      region: "R",
      volume: "750 ml",
      alcohol: "14% Vol",
      farming: "O",
      price: "€10",
      sulfites: "Low",
      drink_from: 2025,
      drink_until: 2030,
      grapes: [],
      vinification: [],
      tasting_notes: { nose: [], palate: [] },
      images: { front: "", back: "" },
    } as any);
    const { getDistinctPurchaseLocations } = await import("../dexie-db");
    const locations = await getDistinctPurchaseLocations();
    expect(locations).toEqual(["Store A", "Store B"]);
  });

  it("throws if updateWine is called without id", async () => {
    const { updateWine } = await import("../dexie-db");
    const badWine = { ...sampleWine } as Partial<typeof sampleWine>;
    delete badWine.id;
    await expect(updateWine(badWine as any)).rejects.toThrow(
      "Wine data must include an id to be updated."
    );
  });

  it("drinkBottle returns undefined if wine does not exist", async () => {
    const { drinkBottle } = await import("../dexie-db");
    const result = await drinkBottle("nonexistent-id");
    expect(result).toBeUndefined();
  });

  it("drinkBottle returns 0 if wine has no inventory", async () => {
    const wineData = {
      ...sampleWine,
      id: "no-inventory",
      vintner: "Vintner",
      appellation: "Appellation",
      region: "Region",
      volume: "750 ml",
      alcohol: "14% Vol",
      farming: "Organic",
      price: "€10.00",
      sulfites: "Low-sulfite",
      drink_from: 2025,
      drink_until: 2030,
      grapes: [],
      vinification: [],
      tasting_notes: { nose: [], palate: [] },
      images: { front: "", back: "" },
    };
    await addWine(wineData as any);
    const { drinkBottle } = await import("../dexie-db");
    const result = await drinkBottle("no-inventory");
    expect(result).toBe(0);
  });

  it("drinkBottle returns 0 if wine has 0 bottles", async () => {
    const wineData = {
      ...sampleWine,
      id: "zero-bottles",
      inventory: {
        bottles: 0,
        purchaseDate: "2025-05-22",
        purchaseLocation: "Test Store",
      },
      vintner: "Vintner",
      appellation: "Appellation",
      region: "Region",
      volume: "750 ml",
      alcohol: "14% Vol",
      farming: "Organic",
      price: "€10.00",
      sulfites: "Low-sulfite",
      drink_from: 2025,
      drink_until: 2030,
      grapes: [],
      vinification: [],
      tasting_notes: { nose: [], palate: [] },
      images: { front: "", back: "" },
    };
    await addWine(wineData as any);
    const { drinkBottle } = await import("../dexie-db");
    const result = await drinkBottle("zero-bottles");
    expect(result).toBe(0);
  });
});
