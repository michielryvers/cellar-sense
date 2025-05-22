import { describe, it, expect, vi, beforeEach } from "vitest";
import * as importExport from "../importExport";

// Mock dependencies
vi.mock("../dexie-db", () => ({
  getAllWines: vi.fn(),
  addWine: vi.fn(),
  deleteAllWines: vi.fn(),
}));

describe("importExport service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("blobToBase64 and base64ToBlob", () => {
    it("converts a Blob to base64 and back", async () => {
      const text = "hello world";
      const blob = new Blob([text], { type: "text/plain" });
      const base64 = await importExport.blobToBase64(blob);
      expect(typeof base64).toBe("string");
      const blob2 = importExport.base64ToBlob(base64);
      expect(blob2).toBeInstanceOf(Blob);
      // Read back the text (use FileReader for compatibility)
      const text2 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(blob2);
      });
      expect(text2).toBe(text);
    });
  });

  describe("exportWinesToJSON", () => {
    it("exports wines as a JSON blob", async () => {
      const { getAllWines } = importExport;
      (getAllWines as any).mockResolvedValue([
        { name: "Wine1", images: { front: undefined, back: undefined } },
        { name: "Wine2", images: { front: undefined, back: undefined } },
      ]);
      const blob = await importExport.exportWinesToJSON();
      expect(blob).toBeInstanceOf(Blob);
      // Use FileReader for compatibility
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(blob);
      });
      expect(text).toContain("Wine1");
      expect(text).toContain("Wine2");
    });
  });

  describe("importWinesFromJSON", () => {
    it("imports wines and calls addWine for each", async () => {
      // Use the re-exported mocks from importExport
      const getAllWines = vi.mocked(importExport.getAllWines);
      const addWine = vi.mocked(importExport.addWine);
      const deleteAllWines = vi.mocked(importExport.deleteAllWines);
      getAllWines.mockResolvedValue([]);
      addWine.mockResolvedValue(undefined);
      deleteAllWines.mockResolvedValue(undefined);
      const wines = [
        { name: "Wine1", images: { front: undefined, back: undefined } },
        { name: "Wine2", images: { front: undefined, back: undefined } },
      ];
      await importExport.importWinesFromJSON(wines);
      expect(deleteAllWines).toHaveBeenCalled();
      expect(addWine).toHaveBeenCalledTimes(2);
    });
  });
});
