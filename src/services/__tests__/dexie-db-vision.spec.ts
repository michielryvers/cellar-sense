import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  db,
  saveRack,
  getRack,
  getAllRacks,
  saveWineLocation,
} from "../dexie-db";
import type { RackDefinition, WineLocation } from "../../shared/types/vision";
import type { Wine } from "../../shared/Wine";
import { deleteDB } from "idb";

describe("Dexie DB Vision Helpers", () => {
  beforeEach(async () => {
    // Ensure a clean database before each test
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    // Clean up the database after each test
    await db.delete();
    // Dexie.delete() doesn't always work as expected with fake-indexeddb
    // so we use idb's deleteDB as a fallback.
    await deleteDB("cellar-sense-db");
  });

  it("should save and retrieve a rack definition", async () => {
    const rackDef: RackDefinition = {
      id: "rack1",
      rackName: "Main Rack",
      markerIds: [1, 2, 3, 4],
      markerPositions: [{ id: 1, x: 0, y: 0 }],
      homography: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      calibrationImageUrl: "test-url",
      lastCalibration: new Date().toISOString(),
    };
    await saveRack(rackDef);
    const retrievedRack = await getRack("rack1");
    expect(retrievedRack).toEqual(rackDef);
  });

  it("should return undefined if rack definition does not exist", async () => {
    const retrievedRack = await getRack("nonexistent");
    expect(retrievedRack).toBeUndefined();
  });

  it("should get all rack definitions", async () => {
    // Initially empty
    const emptyRacks = await getAllRacks();
    expect(emptyRacks).toEqual([]);

    // Add multiple racks
    const rack1: RackDefinition = {
      id: "rack1",
      rackName: "Main Rack",
      markerIds: [1, 2, 3, 4],
      markerPositions: [{ id: 1, x: 0, y: 0 }],
      homography: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      calibrationImageUrl: "test-url-1",
      lastCalibration: new Date().toISOString(),
    };

    const rack2: RackDefinition = {
      id: "rack2",
      rackName: "Secondary Rack",
      markerIds: [5, 6, 7, 8],
      markerPositions: [{ id: 5, x: 100, y: 100 }],
      homography: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      calibrationImageUrl: "test-url-2",
      lastCalibration: new Date().toISOString(),
    };

    await saveRack(rack1);
    await saveRack(rack2);

    const allRacks = await getAllRacks();
    expect(allRacks).toHaveLength(2);
    expect(allRacks).toEqual(expect.arrayContaining([rack1, rack2]));
  });

  it("should save wine location", async () => {
    // First, add a wine to update
    const wine: Wine = {
      id: "wine1",
      name: "Test Wine",
      vintner: "Test Vintner",
      vintage: 2020,
      appellation: "Test Appellation",
      region: "Test Region",
      color: "Red",
      volume: "750ml",
      alcohol: "13%",
      farming: "Organic",
      price: "€10",
      sulfites: "Low",
      drink_from: 2022,
      drink_until: 2025,
      grapes: [],
      vinification: [],
      tasting_notes: { nose: [], palate: [] },
      images: { front: "" },
      inventory: { bottles: 1, purchaseDate: "", purchaseLocation: "" },
    };
    await db.wines.add(wine);

    const location: WineLocation = {
      rackId: "rack1",
      x: 0.5,
      y: 0.5,
    };
    await saveWineLocation("wine1", location);
    const updatedWine = await db.wines.get("wine1");
    expect(updatedWine?.location).toEqual(location);
  });

  it("should handle saving location for a non-existent wine gracefully", async () => {
    const location: WineLocation = {
      rackId: "rack1",
      x: 0.5,
      y: 0.5,
    };
    // Attempt to save location for a wine that doesn't exist
    const result = await saveWineLocation("nonexistentwine", location);
    // Dexie's update returns 0 if no records were updated, 1 if successful.
    expect(result).toBe(0);
    const nonExistentWine = await db.wines.get("nonexistentwine");
    expect(nonExistentWine).toBeUndefined();
  });
});
