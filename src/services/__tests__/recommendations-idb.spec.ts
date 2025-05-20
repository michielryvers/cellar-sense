import {
  recommendationsDb,
  saveRecommendation,
  getAllRecommendations,
  getRecommendationById,
} from "../recommendations-idb";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const sampleResults = [
  { label: "Wine A", score: 0.9 },
  { label: "Wine B", score: 0.8 },
];

describe("recommendations-idb", () => {
  beforeEach(async () => {
    await recommendationsDb.recommendations.clear();
  });
  afterEach(async () => {
    await recommendationsDb.recommendations.clear();
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
