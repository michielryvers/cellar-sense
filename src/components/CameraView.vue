<template>
  <div class="camera-view" ref="containerRef">
    <!-- Camera feed -->
    <video
      ref="videoRef"
      :width="width"
      :height="height"
      :class="{ 'camera-active': isActive, hidden: !isActive }"
      autoplay
      playsinline
      muted
    ></video>

    <!-- 3D Overlay Canvas -->
    <OverlayCanvas
      v-if="isActive && showOverlay"
      :width="width"
      :height="height"
      :target-point="targetPoint"
    />

    <!-- Status indicator overlay -->
    <div v-if="!isActive && !error" class="camera-status">
      <div class="camera-status-inner">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-10 w-10 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <button
          @click="startCamera"
          class="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded"
        >
          Start Camera
        </button>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="camera-error">
      <div class="camera-error-inner">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-10 w-10 mb-2 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p class="text-red-500 font-medium mb-2">{{ error }}</p>
        <button
          @click="startCamera"
          class="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Debug info -->
    <div v-if="isActive && debug" class="camera-debug">
      <div class="p-2 bg-gray-800 bg-opacity-70 text-white text-xs">
        <div>FPS: {{ poseStore.state.fps || 0 }}</div>
        <div>Quality: {{ poseStore.state.quality }}</div>
        <div v-if="poseStore.state.detection">
          Tag: {{ poseStore.state.detection.id }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import { useCamera, type CameraOptions } from "../composables/useCamera";
import { TagDetector } from "../vision/TagDetector";
import { usePoseStore } from "../stores/poseStore";
import OverlayCanvas from "./OverlayCanvas.vue";
import * as THREE from "three";

// Props
const props = withDefaults(
  defineProps<{
    width?: number;
    height?: number;
    debug?: boolean;
    frameSkip?: number;
    autoStart?: boolean;
    showOverlay?: boolean;
  }>(),
  {
    width: 640,
    height: 480,
    debug: false,
    frameSkip: 1,
    autoStart: false,
    showOverlay: true,
  }
);

// Refs
const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<OffscreenCanvas | null>(null);
const animationFrameId = ref<number | null>(null);
const detector = ref<TagDetector | null>(null);
const targetPoint = ref<THREE.Vector3>(new THREE.Vector3(0, 0, 0.2)); // Default target point 20cm in front of the tag

// Store
const poseStore = usePoseStore();

// Camera composable
const cameraOptions: CameraOptions = {
  video: {
    facingMode: "environment",
    width: { ideal: props.width },
    height: { ideal: props.height },
  },
};
const {
  state,
  startCamera: startCameraStream,
  stopCamera: stopCameraStream,
} = useCamera(cameraOptions);

// Computed
const isActive = computed(() => state.isActive);
const error = computed(() => state.error);

// Methods
async function startCamera() {
  try {
    const stream = await startCameraStream();

    if (stream && videoRef.value) {
      videoRef.value.srcObject = stream;
      await nextTick();

      // Wait for video to be ready
      if (videoRef.value.readyState < 2) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            videoRef.value?.removeEventListener("loadeddata", handler);
            resolve();
          };
          videoRef.value?.addEventListener("loadeddata", handler);
        });
      }

      initDetector();
      startDetection();
    }
  } catch (err) {
    console.error("Failed to start camera:", err);
  }
}

function stopCamera() {
  stopDetection();
  stopCameraStream();
}

function initDetector() {
  // Create detector with options
  detector.value = new TagDetector({
    frameSkip: props.frameSkip,
    debug: props.debug,
    // Will estimate intrinsics from the video dimensions
  });

  // Create offscreen canvas for frame processing
  canvasRef.value = new OffscreenCanvas(props.width, props.height);
}

function startDetection() {
  if (!videoRef.value || !detector.value || !canvasRef.value) return;

  const video = videoRef.value;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Could not get canvas context");
    return;
  }

  // Animation loop for processing frames
  const processFrame = async () => {
    if (!video || !ctx || !detector.value || !canvas) return;

    // Draw the current video frame to the offscreen canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Get a bitmap from the canvas
      const bitmap = await createImageBitmap(canvas);

      // Process the frame with the detector
      detector.value
        .processFrame(bitmap)
        .then((result) => {
          if (result.detections && result.detections.length > 0) {
            // Update pose store with the first detection
            // In the future, we can implement multi-tag selection logic
            poseStore.updatePose(result.detections[0], result.timestamp);
          } else {
            // No tags detected in this frame
            if (props.debug) {
              console.log("No tags detected");
            }
          }
        })
        .catch((err) => {
          // Ignore frame skipping errors
          if (err.message !== "Frame skipped") {
            console.error("Detection error:", err);
            poseStore.setError(err.message);
          }
        });
    } catch (err) {
      console.error("Error creating bitmap:", err);
    }

    // Schedule the next frame
    animationFrameId.value = requestAnimationFrame(processFrame);
  };

  // Start the animation loop
  animationFrameId.value = requestAnimationFrame(processFrame);
}

function stopDetection() {
  // Cancel animation frame
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = null;
  }

  // Clean up detector
  if (detector.value) {
    detector.value.dispose();
    detector.value = null;
  }

  // Reset pose store
  poseStore.resetTracking();
}

// Lifecycle hooks
onMounted(() => {
  if (props.autoStart) {
    startCamera();
  }
});

onUnmounted(() => {
  stopDetection();
  stopCameraStream();
});

// Expose methods
defineExpose({
  startCamera,
  stopCamera,
  isActive,
  error,
  targetPoint,
});
</script>

<style scoped>
.camera-view {
  position: relative;
  width: 100%;
  max-width: v-bind('width + "px"');
  height: v-bind('height + "px"');
  background-color: #000;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 0.5rem;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-status,
.camera-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 10;
}

.camera-status-inner,
.camera-error-inner {
  text-align: center;
  padding: 1rem;
}

.camera-debug {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
}

.hidden {
  display: none;
}
</style>
