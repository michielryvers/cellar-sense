/**
 * Interface for wine query objects stored in IndexedDB
 */
export interface WineQuery {
  id?: number;
  frontImage: Blob; // resized JPEG blob
  backImage: Blob | null; // optional
  purchaseLocation?: string;
  bottles: number;
  needsResize: boolean;
  createdAt: number;
  status: "pending" | "done";
}