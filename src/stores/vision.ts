import { defineStore } from "pinia";
import type { DetectedTag } from "../vision/aruco";

/**
 * Accuracy level based on the number of detected markers
 */
export type AccuracyLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";

/**
 * Stores vision-related state for AR bottle finder
 */
export const useVisionStore = defineStore("vision", {
  state: () => ({
    /** Currently detected markers */
    markersInView: [] as DetectedTag[],
    /** Accuracy level based on number of markers detected */
    accuracyLevel: "NONE" as AccuracyLevel,
  }),

  actions: {
    /**
     * Update detected markers and calculate accuracy level
     * @param tags Array of detected ArUco markers
     */
    update(tags: DetectedTag[]) {
      this.markersInView = [...tags];

      // Calculate accuracy level based on number of markers
      if (tags.length === 0) {
        this.accuracyLevel = "NONE";
      } else if (tags.length === 1) {
        this.accuracyLevel = "LOW";
      } else if (tags.length === 2) {
        this.accuracyLevel = "MEDIUM";
      } else {
        this.accuracyLevel = "HIGH"; // 3 or more markers
      }
    },
  },

  getters: {
    /**
     * Get the number of detected markers
     */
    markerCount: (state) => state.markersInView.length,

    /**
     * Get marker IDs as an array
     */
    markerIds: (state) => state.markersInView.map((tag) => tag.id),
  },
});
