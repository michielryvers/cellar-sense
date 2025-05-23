import {
  db,
  addWine,
  getWine,
  updateWine,
  deleteWine,
  saveRecommendation,
  getAllRecommendations,
  getRecommendationById,
  getFilteredWines,
} from "../dexie-db";
describe("recommendations (migrated)", () => {
  beforeEach(async () => {
    await db.recommendations.clear();
  });
  afterEach(async () => {
    await db.recommendations.clear();
  });

  const sampleResults = [
    { id: "1", name: "Wine A", vintner: "V1", vintage: 2020, reason: "Good" },
    { id: "2", name: "Wine B", vintner: "V2", vintage: 2021, reason: "Nice" },
  ];

  it("saves and retrieves recommendations", async () => {
    const id = await saveRecommendation("Best red", sampleResults);
    expect(typeof id).toBe("number");
    const all = await getAllRecommendations();
    expect(all.length).toBe(1);
    expect(all[0].query).toBe("Best red");
    expect(all[0].results.length).toBe(2);
  });

  it("gets recommendation by id", async () => {
    const id = await saveRecommendation("Best white", sampleResults);
    const rec = await getRecommendationById(id);
    expect(rec).toBeDefined();
    expect(rec?.query).toBe("Best white");
  });
});
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
  
  it("getFilteredWines returns all wines when no filters are provided", async () => {
    await addWine({ ...sampleWine, id: "id1", name: "Wine 1", vintner: "Vintner A", color: "Red" } as any);
    await addWine({ ...sampleWine, id: "id2", name: "Wine 2", vintner: "Vintner B", color: "White" } as any);
    
    const result = await getFilteredWines();
    expect(result.length).toBe(2);
  });
  
  it("getFilteredWines filters by vintner", async () => {
    // Create test data without actually using indices
    const testWines = [
      { ...sampleWine, id: "id1", name: "Wine 1", vintner: "Vintner A", color: "Red" },
      { ...sampleWine, id: "id2", name: "Wine 2", vintner: "Vintner B", color: "White" }
    ];
    
    // Add test wines to the database
    await addWine(testWines[0] as any);
    await addWine(testWines[1] as any);
    
    // Mock db.wines.toArray to return our test data
    const toArrayMock = vi.spyOn(db.wines, 'toArray');
    toArrayMock.mockResolvedValue(testWines as any);
    
    // Test filtering by vintner using in-memory filtering from our function
    const result = await getFilteredWines("Vintner A");
    
    // Check that our filter works as expected
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Wine 1");
    
    // Restore the original implementation
    toArrayMock.mockRestore();
  });
  
  it("getFilteredWines filters by color", async () => {
    await addWine({ ...sampleWine, id: "id1", name: "Wine 1", vintner: "Vintner A", color: "Red" } as any);
    await addWine({ ...sampleWine, id: "id2", name: "Wine 2", vintner: "Vintner B", color: "White" } as any);
    
    const result = await getFilteredWines(undefined, "White");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Wine 2");
  });
  
  it("getFilteredWines filters by both vintner and color", async () => {
    // Since vintner is not indexed, we'll mock the implementation to simulate filtering
    const testWines = [
      { ...sampleWine, id: "id1", name: "Wine 1", vintner: "Vintner A", color: "Red" },
      { ...sampleWine, id: "id2", name: "Wine 2", vintner: "Vintner B", color: "White" },
      { ...sampleWine, id: "id3", name: "Wine 3", vintner: "Vintner A", color: "White" }
    ];
    
    // Add the test wines to the database
    await addWine(testWines[0] as any);
    await addWine(testWines[1] as any);
    await addWine(testWines[2] as any);
    
    // Mock the implementation for this test
    const originalToArray = db.wines.toArray;
    db.wines.toArray = async () => testWines as any;
    
    try {
      const result = await getFilteredWines("Vintner A", "White");
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Wine 3");
    } finally {
      // Restore the original implementation
      db.wines.toArray = originalToArray;
    }
  });
});

const sampleResults = [
  { label: "Wine A", score: 0.9 },
  { label: "Wine B", score: 0.8 },
];

describe("recommendations (dexie-db)", () => {
  beforeEach(async () => {
    await db.recommendations.clear();
  });
  afterEach(async () => {
    await db.recommendations.clear();
  });

  it("saves and retrieves recommendations", async () => {
    const id = await saveRecommendation("Best red", sampleResults as any);
    expect(typeof id).toBe("number");
    const all = await getAllRecommendations();
    expect(all.length).toBe(1);
    expect(all[0].query).toBe("Best red");
    expect(all[0].results.length).toBe(2);
  });

  it("gets recommendation by id", async () => {
    const id = await saveRecommendation("Best white", sampleResults as any);
    const rec = await getRecommendationById(id);
    expect(rec).toBeDefined();
    expect(rec?.query).toBe("Best white");
  });
});
