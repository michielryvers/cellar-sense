import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTagHomography,
  projectPointFromReference,
  calculateBottleScreenPosition,
  findTagById,
} from "../tag-pose-service";
import * as projectionUtils from "../../utils/projection";

// Mock the projection utilities
vi.mock("../../utils/projection", () => ({
  calculateHomography: vi.fn().mockReturnValue([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  projectPoint: vi.fn().mockImplementation((point) => point),
}));

describe("tag-pose-service.ts", () => {
  const mockReferenceTag = {
    id: 42,
    corners: [
      [100, 100],
      [200, 100],
      [200, 200],
      [100, 200],
    ] as [number, number][],
  };
  const mockDetectedTag = {
    id: 42,
    center: [350, 350] as [number, number],
    corners: [
      [300, 300],
      [400, 300],
      [400, 400],
      [300, 400],
    ] as [number, number][],
  };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("getTagHomography", () => {
    it("should calculate homography between reference and detected tag", () => {
      const homography = getTagHomography(mockReferenceTag, mockDetectedTag);

      expect(projectionUtils.calculateHomography).toHaveBeenCalledWith(
        mockReferenceTag.corners,
        mockDetectedTag.corners
      );
      expect(homography).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    });
    it("should return cached homography for same tags", () => {
      // Create unique tag instances
      const refTag1 = { ...mockReferenceTag, id: 99 };
      const detTag1 = { ...mockDetectedTag, id: 99 };

      // First call
      const homography1 = getTagHomography(refTag1, detTag1);

      // Second call with same tags
      const homography2 = getTagHomography(refTag1, detTag1);

      // Should return same homography matrix
      expect(homography1).toEqual(homography2);
    });
  });

  describe("projectPointFromReference", () => {
    it("should project a point from reference to current frame", () => {
      const point: [number, number] = [150, 150];

      projectPointFromReference(point, mockReferenceTag, mockDetectedTag);

      expect(projectionUtils.projectPoint).toHaveBeenCalledWith(
        point,
        [1, 0, 0, 0, 1, 0, 0, 0, 1]
      );
    });
  });

  describe("calculateBottleScreenPosition", () => {
    it("should calculate bottle position in current frame", () => {
      const bottleLocation = { x: 0.6, y: 0.4 };
      const photoWidth = 1000;
      const photoHeight = 800;
      const canvasWidth = 1024;
      const canvasHeight = 768;

      const position = calculateBottleScreenPosition(
        bottleLocation,
        photoWidth,
        photoHeight,
        mockReferenceTag,
        mockDetectedTag,
        canvasWidth,
        canvasHeight
      );

      // Given our mocks, we expect the position to be calculated
      expect(position).toBeInstanceOf(Array);
      expect(position.length).toBe(2);
      expect(typeof position[0]).toBe("number");
      expect(typeof position[1]).toBe("number");
    });
  });
  describe("findTagById", () => {
    it("should find a tag by ID in detections array", () => {
      const detections = [
        {
          id: 10,
          center: [100, 100] as [number, number],
          corners: [] as [number, number][],
        },
        {
          id: 42,
          center: [200, 200] as [number, number],
          corners: [] as [number, number][],
        },
        {
          id: 13,
          center: [300, 300] as [number, number],
          corners: [] as [number, number][],
        },
      ];

      const result = findTagById(42, detections);

      expect(result).toEqual(detections[1]);
    });

    it("should return null if tag not found", () => {
      const detections = [
        {
          id: 10,
          center: [100, 100] as [number, number],
          corners: [] as [number, number][],
        },
        {
          id: 13,
          center: [300, 300] as [number, number],
          corners: [] as [number, number][],
        },
      ];

      const result = findTagById(42, detections);

      expect(result).toBeNull();
    });
  });
});
