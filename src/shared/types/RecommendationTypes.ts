/**
 * Interface for wine recommendation options returned by OpenAI
 */
export interface RecommendationOption {
  id: string;
  name: string;
  vintner: string;
  vintage: number | string;
  reason: string;
}

/**
 * Interface for recommendation history entries stored in IndexedDB
 */
export interface RecommendationHistoryEntry {
  id?: number;
  query: string;
  results: RecommendationOption[];
  createdAt: number;
}