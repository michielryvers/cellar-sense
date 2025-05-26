import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useVisionStore } from "../vision";
import type { DetectedTag } from "../../vision/aruco";

describe("Vision Store", () => {
  // Set up a fresh Pinia instance for each test
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should initialize with empty markers and NONE accuracy", () => {
    const visionStore = useVisionStore();

    expect(visionStore.markersInView).toEqual([]);
    expect(visionStore.markerCount).toBe(0);
    expect(visionStore.markerIds).toEqual([]);
    expect(visionStore.accuracyLevel).toBe("NONE");
  });

  it("should update markers and calculate LOW accuracy with 1 marker", () => {
    const visionStore = useVisionStore();
    const mockTags: DetectedTag[] = [
      {
        id: 1,
        corners: [
          [10, 10],
          [50, 10],
          [50, 50],
          [10, 50],
        ],
      },
    ];

    visionStore.update(mockTags);

    expect(visionStore.markersInView).toEqual(mockTags);
    expect(visionStore.markerCount).toBe(1);
    expect(visionStore.markerIds).toEqual([1]);
    expect(visionStore.accuracyLevel).toBe("LOW");
  });

  it("should update markers and calculate MEDIUM accuracy with 2 markers", () => {
    const visionStore = useVisionStore();
    const mockTags: DetectedTag[] = [
      {
        id: 1,
        corners: [
          [10, 10],
          [50, 10],
          [50, 50],
          [10, 50],
        ],
      },
      {
        id: 2,
        corners: [
          [100, 100],
          [150, 100],
          [150, 150],
          [100, 150],
        ],
      },
    ];

    visionStore.update(mockTags);

    expect(visionStore.markersInView).toEqual(mockTags);
    expect(visionStore.markerCount).toBe(2);
    expect(visionStore.markerIds).toEqual([1, 2]);
    expect(visionStore.accuracyLevel).toBe("MEDIUM");
  });

  it("should update markers and calculate HIGH accuracy with 3+ markers", () => {
    const visionStore = useVisionStore();
    const mockTags: DetectedTag[] = [
      {
        id: 1,
        corners: [
          [10, 10],
          [50, 10],
          [50, 50],
          [10, 50],
        ],
      },
      {
        id: 2,
        corners: [
          [100, 100],
          [150, 100],
          [150, 150],
          [100, 150],
        ],
      },
      {
        id: 3,
        corners: [
          [200, 200],
          [250, 200],
          [250, 250],
          [200, 250],
        ],
      },
      {
        id: 4,
        corners: [
          [300, 300],
          [350, 300],
          [350, 350],
          [300, 350],
        ],
      },
    ];

    visionStore.update(mockTags);

    expect(visionStore.markersInView).toEqual(mockTags);
    expect(visionStore.markerCount).toBe(4);
    expect(visionStore.markerIds).toEqual([1, 2, 3, 4]);
    expect(visionStore.accuracyLevel).toBe("HIGH");
  });

  it("should clear markers when updating with empty array", () => {
    const visionStore = useVisionStore();
    // First set some data
    visionStore.update([
      {
        id: 1,
        corners: [
          [10, 10],
          [50, 10],
          [50, 50],
          [10, 50],
        ],
      },
    ]);

    // Then clear it
    visionStore.update([]);

    expect(visionStore.markersInView).toEqual([]);
    expect(visionStore.markerCount).toBe(0);
    expect(visionStore.markerIds).toEqual([]);
    expect(visionStore.accuracyLevel).toBe("NONE");
  });
});
