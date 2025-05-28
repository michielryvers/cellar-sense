import { describe, it, expect, beforeEach, vi } from "vitest";
import { CalibrationService } from "../calibration-service";
import { createPinia, setActivePinia } from "pinia";
import { loadOpenCV } from "../../vision/opencv-loader";

// Mock the vision store
vi.mock("../stores/vision", () => ({
  useVisionStore: () => ({
    markersInView: [],
    update: vi.fn(),
  }),
}));

// Mock the detectTags function
vi.mock("../vision/aruco", () => ({
  detectTags: vi.fn().mockResolvedValue([]),
}));

// Mock the OpenCV loader
vi.mock("../../vision/opencv-loader", () => ({
  loadOpenCV: vi.fn(),
}));

// Mock the database
vi.mock("../services/dexie-db", () => ({
  db: {
    cellarVisionDefinition: {
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

// Mock OpenCV.js
const mockMat = {
  data32F: new Float32Array(32), // 16 points * 2 coordinates each
  delete: vi.fn(),
};

const mockHomographyMat = {
  data64F: new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), // Identity matrix
  rows: 3,
  cols: 3,
  delete: vi.fn(),
};

const mockCV = {
  CV_32FC2: "CV_32FC2",
  RANSAC: "RANSAC",
  Mat: vi.fn().mockImplementation(() => mockMat),
  findHomography: vi.fn(() => mockHomographyMat),
};

// Add cv to window object
(global as any).window = { cv: mockCV };

describe("CalibrationService", () => {
  let service: CalibrationService;
  beforeEach(() => {
    // Create and set a fresh Pinia instance for each test
    setActivePinia(createPinia());

    // Setup OpenCV loader mock
    vi.mocked(loadOpenCV).mockResolvedValue(mockCV);

    service = new CalibrationService();
    // Reset mocks
    vi.clearAllMocks();
  });
  describe("computeHomography", () => {
    it("should return null if less than 4 markers are provided", async () => {
      // @ts-ignore - Private method access for testing
      const result = await service.computeHomography([]);
      expect(result).toBeNull();
    });
    it("should return null if OpenCV loading fails", async () => {
      vi.mocked(loadOpenCV).mockRejectedValueOnce(
        new Error("OpenCV not available")
      );

      const mockMarkers = [
        {
          id: 0,
          corners: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
        },
        {
          id: 1,
          corners: [
            [90, 0],
            [100, 0],
            [100, 10],
            [90, 10],
          ],
        },
        {
          id: 2,
          corners: [
            [0, 90],
            [10, 90],
            [10, 100],
            [0, 100],
          ],
        },
        {
          id: 3,
          corners: [
            [90, 90],
            [100, 90],
            [100, 100],
            [90, 100],
          ],
        },
      ];

      // @ts-ignore - Private method access for testing
      const result = await service.computeHomography(mockMarkers);
      expect(result).toBeNull();
    });

    it("should compute homography matrix from 4 markers using OpenCV", async () => {
      // Create mock marker data
      const mockMarkers = [
        {
          id: 0,
          corners: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ], // top-left
        },
        {
          id: 1,
          corners: [
            [90, 0],
            [100, 0],
            [100, 10],
            [90, 10],
          ], // top-right
        },
        {
          id: 2,
          corners: [
            [0, 90],
            [10, 90],
            [10, 100],
            [0, 100],
          ], // bottom-left
        },
        {
          id: 3,
          corners: [
            [90, 90],
            [100, 90],
            [100, 100],
            [90, 100],
          ], // bottom-right
        },
      ]; // @ts-ignore - Private method access for testing
      const result = await service.computeHomography(mockMarkers); // Verify OpenCV functions were called correctly
      expect(vi.mocked(loadOpenCV)).toHaveBeenCalledTimes(1);
      expect(mockCV.Mat).toHaveBeenCalledTimes(2);
      expect(mockCV.findHomography).toHaveBeenCalledTimes(1);

      // Verify the result
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result?.length).toBe(9);
      expect(result).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]); // Identity matrix

      // Verify cleanup was called
      expect(mockMat.delete).toHaveBeenCalledTimes(2);
      expect(mockHomographyMat.delete).toHaveBeenCalled();
    });
    it("should handle errors gracefully", async () => {
      // Make findHomography throw an error
      mockCV.findHomography.mockImplementationOnce(() => {
        throw new Error("OpenCV error");
      });

      const mockMarkers = [
        {
          id: 0,
          corners: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
        },
        {
          id: 1,
          corners: [
            [90, 0],
            [100, 0],
            [100, 10],
            [90, 10],
          ],
        },
        {
          id: 2,
          corners: [
            [0, 90],
            [10, 90],
            [10, 100],
            [0, 100],
          ],
        },
        {
          id: 3,
          corners: [
            [90, 90],
            [100, 90],
            [100, 100],
            [90, 100],
          ],
        },
      ];

      // @ts-ignore - Private method access for testing
      const result = await service.computeHomography(mockMarkers);
      expect(result).toBeNull();
    });
  });

  describe("calculateRackCorners", () => {
    it("should return null if less than 4 markers are provided", () => {
      // @ts-ignore - Private method access for testing
      const result = service.calculateRackCorners([]);
      expect(result).toBeNull();
    });

    it("should extract the outer corners of the rack from marker positions", () => {
      // Create mock marker data with 4 markers at the corners of a square
      const mockMarkers = [
        {
          id: 0,
          corners: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ], // top-left marker
        },
        {
          id: 1,
          corners: [
            [90, 0],
            [100, 0],
            [100, 10],
            [90, 10],
          ], // top-right marker
        },
        {
          id: 2,
          corners: [
            [0, 90],
            [10, 90],
            [10, 100],
            [0, 100],
          ], // bottom-left marker
        },
        {
          id: 3,
          corners: [
            [90, 90],
            [100, 90],
            [100, 100],
            [90, 100],
          ], // bottom-right marker
        },
      ];

      // @ts-ignore - Private method access for testing
      const result = service.calculateRackCorners(mockMarkers);

      // Validate
      expect(result).not.toBeNull();
      expect(result?.length).toBe(4);

      // Check that we got the correct outer corners
      expect(result?.[0]).toEqual({ x: 0, y: 0 }); // Top-left corner of marker 0
      expect(result?.[1]).toEqual({ x: 100, y: 0 }); // Top-right corner of marker 1
      expect(result?.[2]).toEqual({ x: 100, y: 100 }); // Bottom-right corner of marker 3
      expect(result?.[3]).toEqual({ x: 0, y: 100 }); // Bottom-left corner of marker 2
    });

    it("should sort markers by ID before extracting corners", () => {
      // Create mock markers in random order
      const mockMarkers = [
        {
          id: 3,
          corners: [
            [90, 90],
            [100, 90],
            [100, 100],
            [90, 100],
          ],
        },
        {
          id: 1,
          corners: [
            [90, 0],
            [100, 0],
            [100, 10],
            [90, 10],
          ],
        },
        {
          id: 0,
          corners: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
        },
        {
          id: 2,
          corners: [
            [0, 90],
            [10, 90],
            [10, 100],
            [0, 100],
          ],
        },
      ];

      // @ts-ignore - Private method access for testing
      const result = service.calculateRackCorners(mockMarkers);

      // Should still extract corners correctly after sorting
      expect(result?.[0]).toEqual({ x: 0, y: 0 });
      expect(result?.[1]).toEqual({ x: 100, y: 0 });
      expect(result?.[2]).toEqual({ x: 100, y: 100 });
      expect(result?.[3]).toEqual({ x: 0, y: 100 });
    });
  });

  describe("startCalibration", () => {
    it("should initialize video element and return preview object", () => {
      // Mock video element
      const mockVideo = document.createElement("video");

      // Start calibration
      const preview = service.startCalibration(mockVideo);

      // Verify preview is returned with initial state
      expect(preview.value).toEqual({
        markersVisible: 0,
        homographyReady: false,
        homography: null,
        rackCorners: null,
      });
    });
  });

  describe("saveRack", () => {
    it("should throw error if calibration is not ready", async () => {
      // Mock canvas
      const canvas = document.createElement("canvas");

      // Set preview state to not ready
      service.preview.value.homographyReady = false;

      // Expect saveRack to throw
      await expect(service.saveRack("Test Rack", canvas)).rejects.toThrow(
        "Calibration not ready"
      );
    });
  });
});
