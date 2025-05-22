import { describe, it, expect, vi, beforeEach } from "vitest";
import * as importExport from "../importExport";
import { exportDB, importDB } from "dexie-export-import";

// Mock dependencies
vi.mock("../dexie-db", () => ({
  db: {},
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
    it("imports blob data using Dexie's importDB", async () => {
      const mockBlob = new Blob(["test"], { type: "application/json" });
      await importExport.importWinesFromJSON(mockBlob);
      
      expect(importDB).toHaveBeenCalled();
      
      // Verify importDB was called with the correct parameters
      expect(importDB).toHaveBeenCalledWith(mockBlob, expect.objectContaining({
        clearTablesBeforeImport: true
      }));
    });

    it("throws an error for invalid data format", async () => {
      // Try to import something that's not a Blob
      await expect(importExport.importWinesFromJSON("invalid data"))
        .rejects.toThrow("Invalid import data format - expected Blob");
    });
  });
});
