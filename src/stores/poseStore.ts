import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { Detection } from "../vision/types";

/**
 * Interface representing the state of the pose detection
 */
export interface PoseState {
  /** 4×4 column-major camera view matrix */
  viewMatrix: number[];

  /** Timestamp of the pose detection in ms */
  timestamp: number;

  /** Frames per second of pose detection */
  fps: number;

  /** Quality indicator of the pose detection */
  quality: "green" | "amber" | "red";

  /** Whether pose detection is active */
  isActive: boolean;

  /** Current detection data */
  detection: Detection | null;

  /** Error message if any */
  error: string | null;
}

/**
 * Pinia store for managing AprilTag pose detection state
 */
export const usePoseStore = defineStore("pose", () => {
  // State
  const state = ref<PoseState>({
    viewMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    timestamp: 0,
    fps: 0,
    quality: "red",
    isActive: false,
    detection: null,
    error: null,
  });

  // FPS calculation
  const fpsBuffer = ref<number[]>([]);
  const lastFrameTime = ref<number>(0);

  /**
   * Update pose with new detection data
   */
  function updatePose(detection: Detection, timestamp: number) {
    state.value.detection = detection;
    state.value.timestamp = timestamp;
    state.value.isActive = true;
    state.value.error = null;

    // Update quality based on detection error
    if (detection.err < 0.05) {
      state.value.quality = "green";
    } else if (detection.err < 0.1) {
      state.value.quality = "amber";
    } else {
      state.value.quality = "red";
    }

    // Calculate FPS
    const now = performance.now();
    if (lastFrameTime.value > 0) {
      const delta = now - lastFrameTime.value;
      const instantFps = 1000 / delta;

      // Keep a rolling buffer of the last 10 frames
      fpsBuffer.value.push(instantFps);
      if (fpsBuffer.value.length > 10) {
        fpsBuffer.value.shift();
      }

      // Calculate average FPS
      const sum = fpsBuffer.value.reduce((a, b) => a + b, 0);
      state.value.fps = Math.round(sum / fpsBuffer.value.length);
    }
    lastFrameTime.value = now;
  }

  /**
   * Set error state
   */
  function setError(error: string) {
    state.value.error = error;
    state.value.quality = "red";
  }

  /**
   * Reset tracking state (when tracking is lost)
   */
  function resetTracking() {
    state.value.isActive = false;
    state.value.detection = null;
    state.value.quality = "red";
  }

  /**
   * Check if we have a valid pose
   */
  const hasValidPose = computed(() => {
    return (
      state.value.isActive &&
      state.value.detection !== null &&
      state.value.quality !== "red"
    );
  });

  return {
    state,
    updatePose,
    setError,
    resetTracking,
    hasValidPose,
  };
});
