import { db } from "./dexie-db";
import type { RackDefinition } from "../shared/types/vision";

/**
 * Delete a rack calibration and remove all wine locations in this rack
 * @param rackId The rack id to delete
 */
export async function deleteRackAndWineLocations(
  rackId: string
): Promise<void> {
  // Delete the rack definition
  await db.cellarVisionDefinition.delete(rackId);
  // Remove all wine locations for this rack
  const wines = await db.wines
    .where("location.rackId")
    .equals(rackId)
    .toArray();
  for (const wine of wines) {
    if (wine.id) {
      await db.wines.update(wine.id, { location: undefined });
    }
  }
}
