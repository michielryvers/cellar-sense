/**
 * Interface for cellar photo entries stored in IndexedDB
 */
export interface CellarPhoto {
  id: string; // UUID
  blob: Blob; // compressed JPEG blob
  width: number;
  height: number;
  createdAt: number;
}
