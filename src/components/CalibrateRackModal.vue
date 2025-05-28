<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4"
      style="z-index: 60"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full overflow-hidden shadow-xl"
      >
        <!-- Header -->
        <div class="border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Calibrate Wine Rack
          </h3>
        </div>

        <!-- Content -->
        <div class="p-4">
          <div v-if="!cameraActive">
            <p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Calibrate your wine rack by capturing all 4 ArUco markers at once.
              Place markers at the corners of your rack and ensure all are
              visible.
            </p>
            <button
              @click="startCamera"
              class="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
            >
              Start Camera
            </button>
          </div>

          <div v-else>
            <!-- Camera View with Overlay -->
            <div
              class="relative w-full aspect-video overflow-hidden rounded-md"
            >
              <video
                ref="videoElement"
                class="w-full aspect-video object-cover"
                autoplay
                playsinline
                muted
              ></video>

              <!-- Overlay canvas for markers and grid -->
              <canvas
                ref="overlayCanvas"
                class="absolute top-0 left-0 w-full h-full pointer-events-none"
              ></canvas>

              <!-- Markers count indicator -->
              <div
                class="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm"
              >
                {{ previewState.markersVisible }} / 4 markers
              </div>
            </div>

            <!-- Rack name input (always visible when camera is active) -->
            <div class="mt-4">
              <div class="mb-4">
                <label
                  for="rackName"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Rack Name
                </label>
                <input
                  id="rackName"
                  v-model="rackName"
                  type="text"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="Main Cellar"
                  required
                />
              </div>              <!-- Status messages -->
              <div
                v-if="calibrationError"
                class="text-sm text-red-500 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
              >
                <div class="flex items-start">
                  <ExclamationTriangleIcon class="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div class="font-medium">Calibration Issue</div>
                    <div class="mt-1">{{ calibrationError }}</div>
                    <div class="mt-2 text-xs text-red-600 dark:text-red-400">
                      • Ensure markers are at the corners of your rack in a rectangular pattern<br>
                      • Make sure all 4 markers are clearly visible<br>
                      • Avoid placing markers in a straight line
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-else-if="previewState.homographyReady"
                class="text-sm text-emerald-600 mb-4"
              >
                All markers detected! You can now save the rack calibration.
              </div>
              <div v-else class="text-sm text-amber-500 mb-4">
                Please position your camera to see all 4 markers at the corners
                of your rack.
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-between"
        >
          <button
            @click="closeModal"
            class="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <div v-if="cameraActive" class="flex space-x-2">
            <button
              v-if="previewState.homographyReady"
              @click="retake"
              class="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Retake
            </button>
            <button
              @click="confirmCalibration"
              class="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="!previewState.homographyReady || !rackName.trim()"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import { calibrationService } from "../services/calibration-service";
import { GUIDANCE_COLOR } from "../services/calibration-service";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "calibrated", rackId: string): void;
}>();

// Refs
const videoElement = ref<HTMLVideoElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);
const cameraActive = ref(false);
const rackName = ref("");
const calibrationError = ref<string | null>(null);
interface PreviewState {
  markersVisible: number;
  homographyReady: boolean;
  homography: number[] | null;
  rackCorners: { x: number; y: number }[] | null;
}

const previewState = ref<PreviewState>({
  markersVisible: 0,
  homographyReady: false,
  homography: null,
  rackCorners: null,
});
const stream = ref<MediaStream | null>(null);

// smoothing buffer for rackCorners
const cornerHistory: { x: number; y: number }[][] = [];
const maxHistory = 5;

// Start camera capture
const startCamera = async () => {
  try {
    // Clear any previous calibration errors
    calibrationError.value = null;
    
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    stream.value = mediaStream;

    cameraActive.value = true;
    await nextTick();

    if (!videoElement.value) throw new Error("Video element not found");

    // set video source and bind canplay _before_ play()
    videoElement.value.srcObject = mediaStream;    videoElement.value.oncanplay = () => {
      console.log("[Calibrate] metadata loaded – starting calibration");
      const preview = calibrationService.startCalibration(videoElement.value!);
      watch(
        preview,
        (newVal) => {
          if (newVal.homographyReady && newVal.rackCorners) {
            // add to history + clamp size
            cornerHistory.push(newVal.rackCorners);
            if (cornerHistory.length > maxHistory) cornerHistory.shift();

            // compute mean corners
            const smoothed = newVal.rackCorners.map((_, idx) => {
              const sum = cornerHistory.reduce(
                (acc, corners) => {
                  acc.x += corners[idx].x;
                  acc.y += corners[idx].y;
                  return acc;
                },
                { x: 0, y: 0 }
              );
              const n = cornerHistory.length;
              return { x: sum.x / n, y: sum.y / n };
            });

            previewState.value = { ...newVal, rackCorners: smoothed };
            // Clear any previous calibration errors when successful
            calibrationError.value = null;
          } else {
            // Clear the corner history when homography is not ready
            cornerHistory.length = 0;
            previewState.value = { ...newVal };
            
            // Check for calibration errors from the service
            const lastError = calibrationService.getLastCalibrationError();
            if (lastError) {
              calibrationError.value = lastError;
            }
          }

          // Always redraw overlay to clear it when state changes
          drawOverlay();
        },
        { deep: true }
      );
    };

    await videoElement.value.play();
  } catch (err) {
    console.error("Error accessing camera:", err);
    alert("Could not access camera. Please check permissions.");
  }
};

// Draw the overlay grid and markers
const drawOverlay = () => {
  if (!overlayCanvas.value || !videoElement.value) return;

  const canvas = overlayCanvas.value;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Match canvas size to video dimensions
  canvas.width = videoElement.value.videoWidth;
  canvas.height = videoElement.value.videoHeight;

  // Clear previous drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // If we have rack corners, draw the rack outline and grid
  if (previewState.value.homographyReady && previewState.value.rackCorners) {
    const corners = previewState.value.rackCorners;

    // Draw the rack outline (green rectangle)
    ctx.strokeStyle = GUIDANCE_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y); // top-left
    ctx.lineTo(corners[1].x, corners[1].y); // top-right
    ctx.lineTo(corners[3].x, corners[3].y); // bottom-right
    ctx.lineTo(corners[2].x, corners[2].y); // bottom-left
    ctx.closePath();
    ctx.stroke();

    // Draw 3x3 grid
    ctx.strokeStyle = `${GUIDANCE_COLOR}80`; // 50% opacity
    ctx.lineWidth = 1;

    // Draw horizontal grid lines (2 lines making 3 rows)
    for (let i = 1; i < 3; i++) {
      const t = i / 3;

      // Interpolate between top and bottom edges
      const startX = corners[0].x + (corners[2].x - corners[0].x) * t;
      const startY = corners[0].y + (corners[2].y - corners[0].y) * t;
      const endX = corners[1].x + (corners[3].x - corners[1].x) * t;
      const endY = corners[1].y + (corners[3].y - corners[1].y) * t;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Draw vertical grid lines (2 lines making 3 columns)
    for (let i = 1; i < 3; i++) {
      const t = i / 3;

      // Interpolate between left and right edges
      const startX = corners[0].x + (corners[1].x - corners[0].x) * t;
      const startY = corners[0].y + (corners[1].y - corners[0].y) * t;
      const endX = corners[2].x + (corners[3].x - corners[2].x) * t;
      const endY = corners[2].y + (corners[3].y - corners[2].y) * t;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }
};

// Confirm calibration and save the rack
const confirmCalibration = async () => {
  if (
    !videoElement.value ||
    !rackName.value.trim() ||
    !previewState.value.homographyReady
  ) {
    return;
  }

  try {
    // Create a snapshot canvas
    const snapshotCanvas = document.createElement("canvas");
    snapshotCanvas.width = videoElement.value.videoWidth;
    snapshotCanvas.height = videoElement.value.videoHeight;
    const ctx = snapshotCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Draw the current video frame to the canvas
    ctx.drawImage(videoElement.value, 0, 0);

    // Pass the canvas element directly to the saveRack method
    // The calibration service will handle the image conversion internally

    // Save the rack calibration
    const rackDefinition = await calibrationService.saveRack(
      rackName.value,
      snapshotCanvas
    );

    // Emit and close
    emit("calibrated", rackDefinition.id);
    closeModal();
  } catch (error) {
    console.error("Error saving rack calibration:", error);
    alert("Failed to save rack calibration. Please try again.");
  }
};

// Retake the calibration photo
const retake = () => {
  // Reset the calibration state
  rackName.value = "";
  calibrationError.value = null;

  // Continue using the same camera stream
  // The calibration service will continue detecting markers
};

// Close the modal and clean up
const closeModal = () => {
  // Stop calibration service
  calibrationService.stopCalibration();

  // Stop the camera stream
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop());
    stream.value = null;
  }

  // Reset state
  cameraActive.value = false;
  rackName.value = "";
  calibrationError.value = null;

  // Emit close event
  emit("close");
};

// Clean up on unmount
onUnmounted(() => {
  calibrationService.stopCalibration();

  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop());
  }
});
</script>
