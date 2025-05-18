import Dexie, { type Table } from "dexie";
import type { RecommendationOption } from "./openai-recommend";

export interface RecommendationHistoryEntry {
  id?: number;
  query: string;
  results: RecommendationOption[];
  createdAt: number;
}

class RecommendationsDB extends Dexie {
  recommendations!: Table<RecommendationHistoryEntry, number>;

  constructor() {
    super("cellar-sense-recommendations-db");
    this.version(1).stores({
      recommendations: "++id, createdAt",
    });
  }
}

export const recommendationsDb = new RecommendationsDB();

export async function saveRecommendation(
  query: string,
  results: RecommendationOption[]
): Promise<number> {
  return recommendationsDb.recommendations.add({
    query,
    results,
    createdAt: Date.now(),
  });
}

export async function getAllRecommendations(): Promise<
  RecommendationHistoryEntry[]
> {
  return recommendationsDb.recommendations
    .orderBy("createdAt")
    .reverse()
    .toArray();
}

export async function getRecommendationById(
  id: number
): Promise<RecommendationHistoryEntry | undefined> {
  return recommendationsDb.recommendations.get(id);
}
