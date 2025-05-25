import { describe, it, expect } from "vitest";
import {
  calculateCenter,
  calculateDistance,
  normalizeDistance,
  calculateBottlePosition,
} from "../projection";

describe("projection.ts", () => {
  describe("calculateCenter", () => {
    it("should calculate the center of a rectangle", () => {
      const corners: [number, number][] = [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ];

      const center = calculateCenter(corners);

      expect(center).toEqual([50, 50]);
    });

    it("should calculate the center of an irregular quadrilateral", () => {
      const corners: [number, number][] = [
        [10, 10],
        [110, 20],
        [120, 130],
        [20, 120],
      ];

      const center = calculateCenter(corners);

      expect(center[0]).toBeCloseTo(65, 0);
      expect(center[1]).toBeCloseTo(70, 0);
    });
  });

  describe("calculateDistance", () => {
    it("should calculate distance between two points", () => {
      const point1: [number, number] = [0, 0];
      const point2: [number, number] = [3, 4];

      const distance = calculateDistance(point1, point2);

      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it("should return 0 for identical points", () => {
      const point: [number, number] = [10, 20];

      const distance = calculateDistance(point, point);

      expect(distance).toBe(0);
    });
  });

  describe("normalizeDistance", () => {
    it("should normalize distance within 0-1 range", () => {
      expect(normalizeDistance(50, 100)).toBe(0.5);
      expect(normalizeDistance(0, 100)).toBe(0);
      expect(normalizeDistance(100, 100)).toBe(1);
    });

    it("should clamp values above maxDistance to 1", () => {
      expect(normalizeDistance(150, 100)).toBe(1);
    });

    it("should handle negative values by clamping to 0", () => {
      expect(normalizeDistance(-50, 100)).toBe(0);
    });
  });

  describe("calculateBottlePosition", () => {
    it("should calculate bottle position based on tag detection", () => {
      const referenceTag = {
        corners: [
          [100, 100],
          [200, 100],
          [200, 200],
          [100, 200],
        ] as [number, number][],
      };

      const detectedTag = {
        corners: [
          [300, 300],
          [400, 300],
          [400, 400],
          [300, 400],
        ] as [number, number][],
      };

      const bottleLocation = { x: 0.6, y: 0.4 };
      const canvasWidth = 800;
      const canvasHeight = 600;

      const bottlePosition = calculateBottlePosition(
        referenceTag,
        detectedTag,
        bottleLocation,
        canvasWidth,
        canvasHeight
      );

      // Expected position: center of detected tag (350, 350) plus offset
      const expectedX = 350 + (0.6 - 0.5) * 800 * 0.5;
      const expectedY = 350 + (0.4 - 0.5) * 600 * 0.5;

      expect(bottlePosition[0]).toBeCloseTo(expectedX);
      expect(bottlePosition[1]).toBeCloseTo(expectedY);
    });
  });
});
