import { describe, it, expect, vi, beforeEach } from "vitest";
import * as importExport from "../importExport";
import { exportDB, importDB } from "dexie-export-import";

// Mock dependencies
vi.mock("../dexie-db", () => ({
  db: {},
  addWine: vi.fn(),
  deleteAllWines: vi.fn(),
}));

// Mock dexie-export-import
vi.mock("dexie-export-import", () => ({
  exportDB: vi.fn(),
  importDB: vi.fn(),
}));

// Mock document methods for testing
document.createElement = vi.fn().mockImplementation(() => ({
  href: '',
  download: '',
  click: vi.fn()
}));
URL.createObjectURL = vi.fn().mockReturnValue("mock-url");
URL.revokeObjectURL = vi.fn();

describe("importExport service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("base64ToBlob", () => {
    it("converts base64 to Blob", () => {
      const base64 = "data:text/plain;base64,aGVsbG8gd29ybGQ=";
      const blob = importExport.base64ToBlob(base64);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("text/plain");
    });
  });

  describe("exportWinesToJSON", () => {
    it("exports full database using Dexie's exportDB", async () => {
      const mockBlob = new Blob(["test"], { type: "application/json" });
      (exportDB as any).mockResolvedValue(mockBlob);

      const blob = await importExport.exportWinesToJSON();
      expect(blob).toBe(mockBlob);
      expect(exportDB).toHaveBeenCalled();
      
      // Verify exportDB was called with the right parameters
      expect(exportDB).toHaveBeenCalledWith(
        expect.anything(), 
        expect.objectContaining({ prettyJson: true })
      );
    });
  });

  describe("importWinesFromJSON", () => {
    it("imports array data by calling addWine for each item", async () => {
      // Use the re-exported mocks from importExport
      const addWine = vi.mocked(importExport.addWine);
      const deleteAllWines = vi.mocked(importExport.deleteAllWines);
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
      const deleteAllWines = vi.mocked(importExport.deleteAllWines);
      deleteAllWines.mockResolvedValue(undefined);
      
      const mockBlob = new Blob(["test"], { type: "application/json" });
      await importExport.importWinesFromJSON(mockBlob);
      
      expect(importDB).toHaveBeenCalled();
      
      // Verify importDB was called with the correct parameters
      expect(importDB).toHaveBeenCalledWith(mockBlob, expect.objectContaining({
        clearTablesBeforeImport: true
      }));
    });

    it("throws an error for invalid data format", async () => {
      // Try to import something that's neither an array nor a Blob
      await expect(importExport.importWinesFromJSON("invalid data"))
        .rejects.toThrow("Invalid import data format");
    });
  });
});
