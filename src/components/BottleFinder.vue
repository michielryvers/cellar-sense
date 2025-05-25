<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[60] flex flex-col h-full bg-black bg-opacity-95"
  >
    <!-- Header -->
    <header
      class="flex items-center justify-between p-4 bg-black bg-opacity-80"
    >
      <div class="flex items-center space-x-3">
        <div
          class="w-2 h-2 rounded-full"
          :class="{
            'bg-red-500': !cameraReady,
            'bg-green-500': cameraReady && tagFound,
            'bg-yellow-500': cameraReady && !tagFound,
          }"
        ></div>
        <span class="text-white font-semibold text-lg">Bottle Finder</span>
      </div>
      <button
        @click="handleClose"
        class="text-white bg-gray-800 bg-opacity-70 rounded-full p-2 hover:bg-gray-700 focus:outline-none"
      >
        <XMarkIcon class="h-6 w-6" />
      </button>
    </header>

    <!-- Camera View -->
    <div class="flex-1 relative overflow-hidden">
      <video
        ref="video"
        autoplay
        playsinline
        muted
        width="1024"
        height="768"
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black"
        style="width: 1024px; height: 768px"
      ></video>

      <!-- Hidden canvas for grayscale extraction -->
      <canvas ref="canvas" width="1024" height="768" class="hidden"></canvas>

      <!-- Overlay canvas for AprilTag visualization and bottle marker -->
      <canvas
        ref="overlayCanvas"
        width="1024"
        height="768"
        class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        style="width: 1024px; height: 768px"
      ></canvas>
      <!-- Instructions overlay -->
      <div class="absolute inset-x-4 top-4 z-30">
        <div class="bg-black bg-opacity-60 text-white p-4 rounded-lg">
          <div v-if="cameraError" class="mb-4">
            <div class="text-red-400 mb-2">
              <span class="font-medium">Error: {{ cameraError }}</span>
            </div>
            <button
              @click="retryCamera"
              class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
              :disabled="cameraRetryCount >= maxCameraRetries"
            >
              Retry Camera
            </button>
          </div>
          <div v-else-if="!cameraReady" class="mb-4">
            <div class="flex items-center">
              <svg
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Initializing camera...</span>
            </div>
          </div>
          <div v-else class="flex items-center space-x-2 mb-2">
            <div
              class="w-3 h-3 rounded-full"
              :class="{
                'bg-red-500': !tagFound,
                'bg-green-500': tagFound,
              }"
            ></div>
            <span class="font-medium">
              {{
                tagFound
                  ? "AprilTag detected - Guiding to bottle"
                  : "Looking for reference AprilTag..."
              }}
            </span>
          </div>
          <p class="text-sm text-gray-300">
            Move your camera to find AprilTags on your wine rack. Keep at least
            one tag in view.
          </p>
        </div>
      </div>

      <!-- Distance indicator -->
      <div
        v-if="tagFound && bottlePosition"
        class="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-black bg-opacity-60 text-white px-6 py-3 rounded-full text-lg font-bold"
      >
        <div class="flex items-center justify-center">
          <template v-if="bottleDistance < 0.2">
            <span class="text-green-400">Very close!</span>
          </template>
          <template v-else-if="bottleDistance < 0.5">
            <span class="text-yellow-400">Getting closer...</span>
          </template>
          <template v-else>
            <span class="text-red-400">Keep searching...</span>
          </template>
        </div>
      </div>

      <!-- Camera controls -->
      <div
        class="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-4"
      >
        <!-- Flashlight button - only on supported devices -->
        <button
          v-if="hasFlashlight"
          @click="toggleFlashlight"
          class="w-12 h-12 rounded-full bg-gray-800 bg-opacity-70 flex items-center justify-center"
          :class="{ 'bg-yellow-600': flashlightOn }"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";

// Dynamically import Comlink for worker communication
let Comlink: any = null;
import("comlink").then((mod) => {
  Comlink = mod.default || mod;
});

const APRILTAG_WORKER_PATH = "ApriltagWorker.js";
let apriltag: any = null;
let detectorReady = false;
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { useCamera } from "../composables/useCamera";
import { getCellarPhoto } from "../services/cellar-photo-storage";
import {
  findTagById,
  calculateBottleScreenPosition,
  projectPointFromReference,
} from "../services/tag-pose-service";
import type { Wine, BottleLocation } from "../shared/Wine";
import type { CellarPhoto } from "../shared/types";
import type { TagDetection } from "../services/tag-pose-service";

const props = defineProps<{
  show: boolean;
  wine: Wine;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

// Camera state
const video = ref<HTMLVideoElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);
const cameraReady = ref(false);
const cameraError = ref<string | null>(null);
const detectedTags = ref<any[]>([]);
const tagFound = computed(() => detectedTags.value.length > 0);
const worker = ref<Worker | null>(null);
const processingFrame = ref(false);
const animationFrameId = ref<number | null>(null);

// Bottle finding state
const bottlePosition = ref<{ x: number; y: number } | null>(null);
const bottleDistance = ref<number>(1); // Normalized distance (0-1)

// Flashlight state
const hasFlashlight = ref(false);
const flashlightOn = ref(false);
const cameraStream = ref<MediaStream | null>(null);

// Reference photo data
const referencePhoto = ref<CellarPhoto | null>(null);
const referenceTagId = computed(() => props.wine.location?.tagId);

// Retry functionality
const cameraRetryCount = ref(0);
const maxCameraRetries = 3;

// Camera setup
const camera = useCamera();
const { startCamera, stopCamera } = camera;

// Initialize camera on component mount

onMounted(async () => {
  console.log("[BottleFinder] Mounted. show:", props.show, "wine:", props.wine);
  if (props.show) {
    await setupCamera();
    if (props.wine.location) {
      console.log(
        "[BottleFinder] Loading reference photo for cellPhotoId:",
        props.wine.location.cellPhotoId
      );
      await loadReferencePhoto(props.wine.location.cellPhotoId);
    } else {
      console.warn("[BottleFinder] No wine.location found on mount.");
    }
  }
});

// Stop camera on component unmount
onBeforeUnmount(() => {
  cleanupCamera();
});

// Watch for show prop changes
watch(
  () => props.show,
  async (newValue) => {
    console.log("[BottleFinder] show prop changed:", newValue);
    if (newValue) {
      await setupCamera();
      if (props.wine.location) {
        console.log(
          "[BottleFinder] Loading reference photo for cellPhotoId:",
          props.wine.location.cellPhotoId
        );
        await loadReferencePhoto(props.wine.location.cellPhotoId);
      } else {
        console.warn("[BottleFinder] No wine.location found on show change.");
      }
    } else {
      cleanupCamera();
    }
  }
);

// Setup camera and AprilTag detection
async function setupCamera() {
  console.log("Setting up camera...");
  if (!video.value) {
    console.error("Video element reference is missing");
    cameraError.value =
      "Video element reference is missing. Please reload the app.";
    return;
  }

  try {
    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraError.value =
        "Your browser doesn't support camera access. Try using a modern browser.";
      console.error("Camera API not supported");
      return;
    }

    // Initialize camera with explicit constraints
    const cameraConstraints = {
      video: {
        facingMode: "environment", // Use rear camera
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    console.log("Starting camera with options:", cameraConstraints);

    // Call the startCamera function from the composable
    const stream = await startCamera(cameraConstraints);

    console.log("Camera state after startCamera:", camera.state.value);

    if (camera.state.value.error) {
      cameraError.value = camera.state.value.error;
      cameraReady.value = false;
      console.error("Camera error:", camera.state.value.error);
      return;
    }

    if (camera.state.value.stream || stream) {
      // Connect stream to video element - use the returned stream or the one from state
      const videoStream = stream || camera.state.value.stream;
      video.value.srcObject = videoStream;
      cameraStream.value = videoStream;
      try {
        await video.value.play();
        console.log("[BottleFinder] video.play() called successfully");
      } catch (err) {
        console.warn("[BottleFinder] video.play() failed:", err);
      }
      cameraReady.value = true;
      cameraError.value = null;

      // Check if flashlight is available
      checkFlashlightAvailability();

      // Initialize AprilTag worker
      try {
        initAprilTagWorker();
        // Start processing video frames
        startFrameProcessing();
      } catch (error) {
        console.error("Error initializing AprilTag worker:", error);
        cameraError.value = "Failed to initialize AprilTag detection";
      }
    } else {
      console.error("Camera stream is null after startCamera");
      cameraError.value =
        "Failed to get camera stream. Please check your permissions and try again.";
    }
  } catch (error) {
    console.error("Error setting up camera:", error);
    cameraReady.value = false;
    cameraError.value =
      error instanceof Error
        ? error.message
        : "Failed to setup camera. Please try again.";
  }
}

// Clean up camera and resources
function cleanupCamera() {
  stopCamera();
  cameraStream.value = null;

  if (worker.value) {
    worker.value.terminate();
    worker.value = null;
  }

  if (animationFrameId.value !== null) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = null;
  }

  cameraReady.value = false;
  detectedTags.value = [];
}

// Initialize AprilTag detection worker
async function initAprilTagWorker() {
  try {
    console.log("Initializing AprilTag worker...");

    // Check if the worker already exists, terminate it first
    if (worker.value) {
      worker.value.terminate();
      worker.value = null;
    }

    worker.value = new Worker(APRILTAG_WORKER_PATH);

    // Wait for Comlink to be loaded
    while (!Comlink) await new Promise((r) => setTimeout(r, 10));
    apriltag = Comlink.wrap(worker.value);
    // Initialize detector
    await apriltag.init(new Comlink.proxy(() => {}));
    detectorReady = true;

    // Optionally, you can still set up onerror for the worker
    worker.value.onerror = (e) => {
      console.error("AprilTag worker error:", e);
      cameraError.value =
        "AprilTag detection failed to initialize. Please try again.";
      worker.value = null;
    };

    console.log("AprilTag worker initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to create AprilTag worker:", error);
    cameraError.value =
      "Failed to initialize AprilTag detection. Your browser may not support Web Workers.";
    worker.value = null;
    return false;
  }
}

// Process video frames for AprilTag detection
function startFrameProcessing() {
  console.log("[BottleFinder] startFrameProcessing called");
  if (!canvas.value || !video.value || !overlayCanvas.value) {
    console.error("Required elements for frame processing are missing");
    cameraError.value = "Camera initialization failed. Please reload the app.";
    return;
  }

  const ctx = canvas.value.getContext("2d");
  const overlayCtx = overlayCanvas.value.getContext("2d");

  if (!ctx || !overlayCtx) {
    console.error("Could not get canvas contexts");
    cameraError.value =
      "Failed to initialize camera view. Your browser may not support canvas.";
    return;
  }

  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5;

  const processFrame = () => {
    console.log("[BottleFinder] processFrame running");
    try {
      // Log state before processing
      console.log("[BottleFinder] processFrame state:", {
        processingFrame: processingFrame.value,
        video: video.value,
        readyState: video.value ? video.value.readyState : undefined,
        HAVE_ENOUGH_DATA: video.value
          ? video.value.HAVE_ENOUGH_DATA
          : undefined,
      });
      // Only process frame if we're not already processing one and the video is ready
      if (
        !processingFrame.value &&
        video.value &&
        video.value.readyState === video.value.HAVE_ENOUGH_DATA
      ) {
        // Draw current frame to canvas for processing
        ctx.drawImage(
          video.value,
          0,
          0,
          canvas.value!.width,
          canvas.value!.height
        );

        // Get grayscale image data for AprilTag detection (like CellarPhotoCapture)
        const width = video.value.videoWidth;
        const height = video.value.videoHeight;
        if (canvas.value) {
          canvas.value.width = width;
          canvas.value.height = height;
          ctx.drawImage(video.value, 0, 0, width, height);
        } else {
          console.error("Canvas element is null");
          return;
        }
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const gray = new Uint8Array(width * height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          gray[j] = (data[i] + data[i + 1] + data[i + 2]) / 3;
        }

        // Use Comlink-wrapped apriltag worker for detection
        if (apriltag && detectorReady) {
          console.log("[BottleFinder] Sending frame to apriltag.detect");
          processingFrame.value = true;
          apriltag
            .detect(gray, width, height)
            .then((detections: any[]) => {
              detectedTags.value = detections || [];
              processingFrame.value = false;
              // If we have detections and a bottle location, calculate the bottle position
              if (detections && detections.length > 0 && props.wine.location) {
                calculateBottlePosition(detections);
              } else {
                bottlePosition.value = null;
              }
              // Draw detected tags
              overlayCtx.clearRect(
                0,
                0,
                overlayCanvas.value!.width,
                overlayCanvas.value!.height
              );
              drawDetections(overlayCtx);
            })
            .catch((err: any) => {
              console.error("[BottleFinder] apriltag.detect error:", err);
              processingFrame.value = false;
            });
          // Reset consecutive errors counter on successful processing
          consecutiveErrors = 0;
        } else {
          console.warn("Apriltag worker not ready, skipping frame processing");
          consecutiveErrors++;
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.log(
              "Attempting to reinitialize AprilTag worker after multiple failures"
            );
            initAprilTagWorker();
            consecutiveErrors = 0;
          }
        }

        // Clear overlay canvas
        overlayCtx.clearRect(
          0,
          0,
          overlayCanvas.value!.width,
          overlayCanvas.value!.height
        );

        // Draw detected tags
        drawDetections(overlayCtx);
      }
    } catch (error) {
      console.error("Error in frame processing:", error);
      consecutiveErrors++;
      processingFrame.value = false;

      // Stop processing if we encounter too many consecutive errors
      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.error(
          "Too many consecutive errors in frame processing, stopping"
        );
        cameraError.value = "Camera processing failed. Please try again.";
        return;
      }
    }

    // Request next frame if component is still mounted and visible
    if (props.show) {
      animationFrameId.value = requestAnimationFrame(processFrame);
    }
  };

  // Start processing
  processFrame();
}

// Draw detections and bottle marker on overlay canvas
function drawDetections(ctx: CanvasRenderingContext2D) {
  if (!overlayCanvas.value) return;

  const width = overlayCanvas.value.width;
  const height = overlayCanvas.value.height;

  // Draw detected AprilTags
  detectedTags.value.forEach((detection) => {
    // Draw tag corners
    ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(detection.corners[0][0], detection.corners[0][1]);
    ctx.lineTo(detection.corners[1][0], detection.corners[1][1]);
    ctx.lineTo(detection.corners[2][0], detection.corners[2][1]);
    ctx.lineTo(detection.corners[3][0], detection.corners[3][1]);
    ctx.closePath();
    ctx.stroke();

    // Draw tag ID
    ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
    ctx.font = "16px Arial";
    ctx.fillText(
      `ID: ${detection.id}`,
      detection.center[0],
      detection.center[1] - 20
    );
  });

  // Draw bottle marker if position is calculated
  if (bottlePosition.value) {
    const { x, y } = bottlePosition.value;

    // Calculate pulse animation based on time
    const pulseScale = 1 + 0.2 * Math.sin(Date.now() / 200);

    // Outer circle (pulse effect)
    ctx.beginPath();
    ctx.arc(x, y, 30 * pulseScale, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(255, 0, 255, ${0.3 - bottleDistance.value * 0.2})`;
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 0, 255, 0.8)";
    ctx.fill();

    // Draw crosshair
    ctx.strokeStyle = "rgba(255, 0, 255, 0.6)";
    ctx.lineWidth = 2;

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(x - 40, y);
    ctx.lineTo(x + 40, y);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, y - 40);
    ctx.lineTo(x, y + 40);
    ctx.stroke();

    // Draw label
    ctx.fillStyle = "white";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("BOTTLE", x, y - 40);
  }
}

// Calculate bottle position in camera view based on detected tag
function calculateBottlePosition(detections: TagDetection[]) {
  console.log("[BottleFinder] calculateBottlePosition called", {
    wineLocation: props.wine.location,
    referencePhoto: referencePhoto.value,
    detections,
  });
  if (!props.wine.location || !referencePhoto.value) {
    console.warn(
      "[BottleFinder] Missing wine location or reference photo, cannot calculate bottle position",
      {
        wineLocation: props.wine.location,
        referencePhoto: referencePhoto.value,
      }
    );
    bottlePosition.value = null;
    return;
  }

  try {
    // Find the reference tag (the one we used when marking the bottle)
    const matchingTag = findTagById(props.wine.location.tagId, detections);

    if (!matchingTag) {
      console.log(
        `[BottleFinder] Tag with ID ${props.wine.location.tagId} not found in current detections`,
        detections
      );
      bottlePosition.value = null;
      return;
    }

    // Ensure canvas dimensions are available
    const canvasWidth = overlayCanvas.value?.width || 1024;
    const canvasHeight = overlayCanvas.value?.height || 768;

    if (!canvasWidth || !canvasHeight) {
      console.error("[BottleFinder] Invalid canvas dimensions", {
        canvasWidth,
        canvasHeight,
      });
      bottlePosition.value = null;
      return;
    }

    // Normalize corners to [x, y] arrays if needed
    function normalizeCorners(corners: any[]): [number, number][] {
      return corners.map((c) => {
        if (Array.isArray(c)) {
          // Ensure array has at least 2 elements
          return [Number(c[0] || 0), Number(c[1] || 0)] as [number, number];
        } else {
          // Handle object with x,y properties
          return [Number(c.x || 0), Number(c.y || 0)] as [number, number];
        }
      });
    }

    // Log the tag/corner structure and bottle location for debugging
    const normalizedCorners = normalizeCorners(matchingTag.corners) as [
      number,
      number
    ][];
    console.log("[BottleFinder] Tag/corner structure:", {
      matchingTag,
      matchingTagCorners: matchingTag.corners,
      normalizedCorners,
      wineLocation: props.wine.location,
      referencePhoto: referencePhoto.value,
      bottleLocationX: props.wine.location.x,
      bottleLocationY: props.wine.location.y,
    });

    // Log arguments to calculateBottleScreenPosition
    console.log("[BottleFinder] Args to calculateBottleScreenPosition:", {
      bottleLocation: props.wine.location,
      photoWidth: referencePhoto.value.width,
      photoHeight: referencePhoto.value.height,
      referenceTag: {
        id: props.wine.location.tagId,
        corners: normalizedCorners,
      },
      detectedTag: matchingTag,
      canvasWidth,
      canvasHeight,
    });

    const referenceTag: { id: number; corners: [number, number][] } = {
      id: props.wine.location.tagId,
      corners: normalizeCorners(matchingTag.corners) as [number, number][],
    };

    // Validate reference photo dimensions
    if (!referencePhoto.value.width || !referencePhoto.value.height) {
      console.error(
        "[BottleFinder] Invalid reference photo dimensions",
        referencePhoto.value
      );
      bottlePosition.value = null;
      return;
    }

    // Use tag pose service to project the bottle location using homography
    try {
      // Convert normalized bottle location to pixel coordinates in reference photo
      const bottleRefX = props.wine.location.x * referencePhoto.value.width;
      const bottleRefY = props.wine.location.y * referencePhoto.value.height;
      const bottleRefPoint: [number, number] = [bottleRefX, bottleRefY];

      // Project the bottle point from reference photo to current frame using homography
      const projected = projectPointFromReference(
        bottleRefPoint,
        referenceTag,
        matchingTag
      );
      let [bottleX, bottleY] = projected;

      // If the camera frame and overlay canvas are different sizes, scale accordingly
      // (Assume detectedTag corners are in video/camera pixel space)
      const videoWidth = video.value?.videoWidth || referencePhoto.value.width;
      const videoHeight =
        video.value?.videoHeight || referencePhoto.value.height;
      if (
        (videoWidth !== canvasWidth || videoHeight !== canvasHeight) &&
        videoWidth > 0 &&
        videoHeight > 0
      ) {
        bottleX = (bottleX / videoWidth) * canvasWidth;
        bottleY = (bottleY / videoHeight) * canvasHeight;
      }

      // Validate results - ensure they are within canvas bounds
      if (
        isNaN(bottleX) ||
        isNaN(bottleY) ||
        bottleX < 0 ||
        bottleX > canvasWidth ||
        bottleY < 0 ||
        bottleY > canvasHeight
      ) {
        console.warn(
          "[BottleFinder] Projected bottle position is outside canvas bounds:",
          {
            bottleX,
            bottleY,
            canvasWidth,
            canvasHeight,
            projected,
            videoWidth,
            videoHeight,
          }
        );
        bottlePosition.value = null;
        return;
      }

      console.log("[BottleFinder] Bottle position projected:", {
        x: bottleX,
        y: bottleY,
        projected,
        videoWidth,
        videoHeight,
        canvasWidth,
        canvasHeight,
      });
      bottlePosition.value = { x: bottleX, y: bottleY };

      // Calculate distance from center of screen (normalized)
      const distanceToCenter = Math.sqrt(
        Math.pow((bottleX - canvasWidth / 2) / canvasWidth, 2) +
          Math.pow((bottleY - canvasHeight / 2) / canvasHeight, 2)
      );

      bottleDistance.value = Math.min(distanceToCenter, 1);
    } catch (positionError) {
      console.error(
        "[BottleFinder] Error projecting bottle screen position:",
        positionError
      );
      bottlePosition.value = null;
    }
  } catch (error) {
    console.error("[BottleFinder] Error in calculateBottlePosition:", error);
    bottlePosition.value = null;
  }
}

// Load reference photo for bottle location
async function loadReferencePhoto(photoId: string) {
  if (!photoId) {
    console.error("Invalid photo ID provided");
    return;
  }

  try {
    console.log(`Loading reference photo with ID: ${photoId}`);
    const photo = await getCellarPhoto(photoId);

    if (photo) {
      console.log("Reference photo loaded successfully");
      referencePhoto.value = photo;
      // Validate the loaded photo
      if (!photo.width || !photo.height) {
        console.warn("Reference photo has invalid dimensions", photo);
      }
    } else {
      console.error(`Reference photo with ID ${photoId} not found`);
      cameraError.value =
        "Could not find the reference photo for this bottle's location. The bottle might need to be relocated.";
    }
  } catch (error) {
    console.error("Error loading reference photo:", error);
    cameraError.value =
      "Failed to load reference photo data. Please try again.";
  }
}

// Check if flashlight is available
function checkFlashlightAvailability() {
  if (!cameraStream.value) {
    console.log("No camera stream available, can't check flashlight");
    hasFlashlight.value = false;
    return;
  }

  try {
    const tracks = cameraStream.value.getVideoTracks();
    if (!tracks || tracks.length === 0) {
      console.log("No video tracks available");
      hasFlashlight.value = false;
      return;
    }

    const track = tracks[0];
    if (!track || typeof track.getCapabilities !== "function") {
      console.log("Track doesn't support getCapabilities");
      hasFlashlight.value = false;
      return;
    }

    const capabilities = track.getCapabilities();
    console.log("Camera capabilities:", capabilities);

    // 'torch' is a non-standard capability, so use type assertion
    const extendedCapabilities = capabilities as MediaTrackCapabilities & {
      torch?: boolean;
    };

    hasFlashlight.value = !!extendedCapabilities.torch;
    console.log("Flashlight available:", hasFlashlight.value);

    // On iOS, the torch capability may not be reported correctly,
    // so we'll try to check if the device likely has a flash
    if (
      !hasFlashlight.value &&
      navigator.userAgent.match(/iPhone|iPad|iPod/i)
    ) {
      // Attempt to detect rear camera on iOS
      const isEnvironmentFacing =
        track.getSettings().facingMode === "environment";
      if (isEnvironmentFacing) {
        console.log(
          "iOS device with rear camera detected, assuming flashlight is available"
        );
        hasFlashlight.value = true;
      }
    }
  } catch (error) {
    console.error("Error checking flashlight availability:", error);
    hasFlashlight.value = false;
  }
}

// Toggle flashlight on/off
async function toggleFlashlight() {
  if (!cameraStream.value) {
    console.error("No camera stream available, can't toggle flashlight");
    return;
  }

  if (!hasFlashlight.value) {
    console.error("Flashlight not available on this device");
    return;
  }

  const tracks = cameraStream.value.getVideoTracks();
  if (!tracks || tracks.length === 0) {
    console.error("No video tracks available");
    return;
  }

  const track = tracks[0];
  if (!track || typeof track.applyConstraints !== "function") {
    console.error("Track doesn't support applyConstraints");
    return;
  }

  try {
    // Toggle the state
    flashlightOn.value = !flashlightOn.value;
    console.log(
      `Attempting to turn flashlight ${flashlightOn.value ? "ON" : "OFF"}`
    );

    // 'torch' is a non-standard constraint, so use type assertion
    const torchConstraint = {
      advanced: [
        { torch: flashlightOn.value } as MediaTrackConstraintSet & {
          torch: boolean;
        },
      ],
    };

    await track.applyConstraints(torchConstraint);
    console.log(
      `Flashlight ${flashlightOn.value ? "enabled" : "disabled"} successfully`
    );
  } catch (error) {
    console.error("Error toggling flashlight:", error);
    // Revert the state if there was an error
    flashlightOn.value = false;

    // Some devices may require a different approach
    try {
      console.log("Trying alternative flashlight method...");
      // Try a second approach with a different constraint format
      await track.applyConstraints({
        advanced: [
          { torch: flashlightOn.value } as MediaTrackConstraintSet & {
            torch: boolean;
          },
        ],
      });
    } catch (alternativeError) {
      console.error(
        "Alternative flashlight method also failed:",
        alternativeError
      );
    }
  }
}

// Close the finder
function handleClose() {
  cleanupCamera();
  emit("close");
}

// Function to retry camera initialization
async function retryCamera() {
  if (cameraRetryCount.value >= maxCameraRetries) {
    cameraError.value =
      "Failed to access camera after multiple attempts. Please check your camera permissions.";
    return;
  }

  cameraRetryCount.value++;
  cameraError.value = null;
  console.log(
    `Retrying camera setup (attempt ${cameraRetryCount.value}/${maxCameraRetries})...`
  );
  await setupCamera();
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
