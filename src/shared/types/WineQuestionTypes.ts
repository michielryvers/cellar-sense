/**
 * Interface for wine question entries stored in IndexedDB
 */
export interface WineQuestionEntry {
  id?: number;
  question: string;
  response: string;
  createdAt: number;
}