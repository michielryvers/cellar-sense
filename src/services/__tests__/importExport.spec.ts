import { describe, it, expect, vi, beforeEach } from "vitest";
import * as importExport from "../importExport";
import { exportDB, importDB } from "dexie-export-import";

// Mock dependencies
vi.mock("../dexie-db", () => ({
  db: {},
  getAllWines: vi.fn(),
  addWine: vi.fn(),
  deleteAllWines: vi.fn(),
}));

// Mock dexie-export-import
vi.mock("dexie-export-import", () => ({
  exportDB: vi.fn(),
  importDB: vi.fn(),
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
    it("exports wines using Dexie's exportDB", async () => {
      const mockBlob = new Blob(["test"], { type: "application/json" });
      (exportDB as any).mockResolvedValue(mockBlob);

      const blob = await importExport.exportWinesToJSON();
      expect(blob).toBe(mockBlob);
      expect(exportDB).toHaveBeenCalled();
      
      // Verify exportDB was called with the correct filter
      const exportOptions = (exportDB as any).mock.calls[0][1];
      expect(exportOptions.filter).toBeDefined();
      expect(exportOptions.filter("wines")).toBe(true);
      expect(exportOptions.filter("other-table")).toBe(false);
    });
  });

  describe("importWinesFromJSON", () => {
    it("imports array data by calling addWine for each item", async () => {
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
      expect(importDB).not.toHaveBeenCalled(); // Should not use importDB for array data
    });

    it("imports blob data using Dexie's importDB", async () => {
      const getAllWines = vi.mocked(importExport.getAllWines);
      const deleteAllWines = vi.mocked(importExport.deleteAllWines);
      getAllWines.mockResolvedValue([]);
      deleteAllWines.mockResolvedValue(undefined);
      
      const mockBlob = new Blob(["test"], { type: "application/json" });
      await importExport.importWinesFromJSON(mockBlob);
      
      expect(deleteAllWines).toHaveBeenCalled();
      expect(importDB).toHaveBeenCalled();
      
      // Verify importDB was called with the correct parameters
      expect(importDB).toHaveBeenCalledWith(mockBlob, expect.objectContaining({
        filter: expect.any(Function),
        clearTablesBeforeImport: true
      }));
    });

    it("throws an error for invalid data format", async () => {
      const getAllWines = vi.mocked(importExport.getAllWines);
      getAllWines.mockResolvedValue([]);
      
      // Try to import something that's neither an array nor a Blob
      await expect(importExport.importWinesFromJSON("invalid data"))
        .rejects.toThrow("Invalid import data format");
    });
  });
});
