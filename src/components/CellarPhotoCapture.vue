<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex flex-col h-full bg-black bg-opacity-95"
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
            'bg-green-500': cameraReady && detectedTags.length > 0,
            'bg-yellow-500': cameraReady && detectedTags.length === 0,
          }"
        ></div>
        <span class="text-white font-semibold text-lg"
          >Cellar Photo Capture</span
        >
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

      <!-- Hidden canvas for grayscale extraction and capture -->
      <canvas ref="canvas" width="1024" height="768" class="hidden"></canvas>

      <!-- Overlay canvas for AprilTag visualization -->
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
          <div class="flex items-center space-x-2 mb-2">
            <div
              class="w-3 h-3 rounded-full"
              :class="{
                'bg-red-500': detectedTags.length === 0,
                'bg-green-500': detectedTags.length > 0,
              }"
            ></div>
            <span class="font-medium">
              {{
                detectedTags.length > 0
                  ? `${detectedTags.length} AprilTag(s) detected`
                  : "Looking for AprilTags..."
              }}
            </span>
          </div>
          <p class="text-sm text-gray-300">
            Position your wine rack so AprilTags are clearly visible. These tags
            will help locate bottles later.
          </p>
        </div>
      </div>

      <!-- Capture controls -->
      <div
        class="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-4"
      >
        <button
          @click="handleCapture"
          :disabled="!cameraReady || isCapturing"
          class="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          :class="{ 'animate-pulse': isCapturing }"
        >
          <div
            class="w-full h-full bg-purple-600 rounded-full scale-75 transition-transform hover:scale-90"
          ></div>
        </button>

        <div
          v-if="detectedTags.length > 0"
          class="bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg text-sm"
        >
          Tags: {{ detectedTags.map((tag) => tag.id).join(", ") }}
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div
      v-if="isCapturing"
      class="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40"
    >
      <div class="text-white text-center">
        <div
          class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"
        ></div>
        <p>Saving cellar photo...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { saveCellarPhoto } from "../services/cellar-photo-storage";

// Dynamically import Comlink for worker communication
let Comlink: any = null;
import("comlink").then((mod) => {
  Comlink = mod.default || mod;
});

// AprilTag worker setup
const APRILTAG_WORKER_PATH = "ApriltagWorker.js";
let apriltagWorker: Worker | null = null;
let apriltag: any = null;
let detectorReady = false;

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "photo-captured", photo: { id: string; url: string; tags: any[] }): void;
}>();

// Component refs
const video = ref<HTMLVideoElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);

// Component state
const cameraReady = ref(false);
const isCapturing = ref(false);
const detectedTags = ref<any[]>([]);
let stream: MediaStream | null = null;

/**
 * Convert video frame to grayscale for AprilTag detection
 */
function getGrayscaleFromVideo(
  videoEl: HTMLVideoElement,
  canvasEl: HTMLCanvasElement
): Uint8Array | null {
  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;
  if (!width || !height) return null;

  canvasEl.width = width;
  canvasEl.height = height;
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(videoEl, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const gray = new Uint8Array(width * height);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (data[i] + data[i + 1] + data[i + 2]) / 3;
  }

  return gray;
}

/**
 * Start camera stream and AprilTag detection
 */
const startCamera = async () => {
  console.log("[CellarPhotoCapture] Starting camera...");

  if (!video.value) {
    console.log("[CellarPhotoCapture] Video ref not ready");
    return;
  }

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API not supported in this browser");
    }

    // Request camera with high resolution for cellar photos
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: "environment", // Prefer rear camera
      },
    });

    video.value.srcObject = stream;

    try {
      await video.value.play();
      cameraReady.value = true;
      console.log("[CellarPhotoCapture] Camera started successfully");

      // Initialize AprilTag detection
      if (!apriltagWorker) {
        apriltagWorker = new Worker(APRILTAG_WORKER_PATH);
        // Wait for Comlink to be loaded
        while (!Comlink) await new Promise((r) => setTimeout(r, 10));
        apriltag = Comlink.wrap(apriltagWorker);
        // Initialize detector
        await apriltag.init(new Comlink.proxy(() => {}));
        detectorReady = true;
      }

      runApriltagDetection();
    } catch (err) {
      console.error("[CellarPhotoCapture] Video play failed:", err);
      throw err;
    }
  } catch (error) {
    console.error("[CellarPhotoCapture] Camera error:", error);
    emit("close");
  }
};

/**
 * AprilTag detection loop
 */
async function runApriltagDetection() {
  if (
    !video.value ||
    !canvas.value ||
    !overlayCanvas.value ||
    !apriltag ||
    !detectorReady
  ) {
    return;
  }

  if (video.value.readyState < 2) {
    requestAnimationFrame(runApriltagDetection);
    return;
  }

  const gray = getGrayscaleFromVideo(video.value, canvas.value);
  if (gray) {
    const width = video.value.videoWidth;
    const height = video.value.videoHeight;

    try {
      const detections = await apriltag.detect(gray, width, height);
      detectedTags.value = detections || [];

      // Draw detections on overlay canvas
      if (overlayCanvas.value) {
        const ctx = overlayCanvas.value.getContext("2d");
        overlayCanvas.value.width = width;
        overlayCanvas.value.height = height;

        if (ctx) {
          ctx.clearRect(
            0,
            0,
            overlayCanvas.value.width,
            overlayCanvas.value.height
          );

          if (detections && detections.length > 0) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "lime";
            ctx.font = "16px Arial";
            ctx.fillStyle = "yellow";

            detections.forEach((det: any) => {
              if (det.corners && det.corners.length === 4) {
                // Draw outline
                ctx.beginPath();
                ctx.moveTo(det.corners[0].x, det.corners[0].y);
                for (let i = 1; i < 4; i++) {
                  ctx.lineTo(det.corners[i].x, det.corners[i].y);
                }
                ctx.closePath();
                ctx.stroke();

                // Draw colored corners
                const cornerColors = [
                  "#ff3333",
                  "#33ff33",
                  "#3333ff",
                  "#ffff33",
                ];
                for (let i = 0; i < 4; i++) {
                  ctx.beginPath();
                  ctx.arc(
                    det.corners[i].x,
                    det.corners[i].y,
                    6,
                    0,
                    2 * Math.PI
                  );
                  ctx.fillStyle = cornerColors[i];
                  ctx.fill();
                  ctx.strokeStyle = "#222";
                  ctx.lineWidth = 2;
                  ctx.stroke();
                }

                // Draw tag ID
                if (det.center) {
                  ctx.fillStyle = "yellow";
                  ctx.fillText(`ID: ${det.id}`, det.center.x, det.center.y);
                }
              }
            });
          }
        }
      }
    } catch (error) {
      const err = error as any;
      if (err?.message?.includes("WASM module not ready")) {
        setTimeout(runApriltagDetection, 500);
        return;
      }
      console.error("[CellarPhotoCapture] Detection error:", error);
    }
  }

  requestAnimationFrame(runApriltagDetection);
}

/**
 * Capture photo and save to storage
 */
const handleCapture = async () => {
  if (!video.value || !canvas.value || isCapturing.value) return;

  isCapturing.value = true;
  console.log("[CellarPhotoCapture] Capturing photo...");

  try {
    // Capture full resolution image
    const width = video.value.videoWidth;
    const height = video.value.videoHeight;

    canvas.value.width = width;
    canvas.value.height = height;
    const ctx = canvas.value.getContext("2d");

    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(video.value, 0, 0, width, height);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.value!.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Failed to capture image"));
        },
        "image/jpeg",
        0.9
      );
    });

    // Save to storage with detected tags
    const savedPhoto = await saveCellarPhoto(blob, detectedTags.value);

    // Create URL for immediate display
    const photoUrl = URL.createObjectURL(savedPhoto.blob);

    console.log("[CellarPhotoCapture] Photo saved:", savedPhoto.id);

    // Emit success event
    emit("photo-captured", {
      id: savedPhoto.id,
      url: photoUrl,
      tags: detectedTags.value,
    });

    // Close the capture modal
    handleClose();
  } catch (error) {
    console.error("[CellarPhotoCapture] Capture failed:", error);
    // Could emit error event here if needed
  } finally {
    isCapturing.value = false;
  }
};

/**
 * Stop camera and clean up resources
 */
const stopCamera = () => {
  if (stream) {
    if (typeof stream.getTracks === "function") {
      const tracks = stream.getTracks();
      if (Array.isArray(tracks)) {
        tracks.forEach((track) => {
          if (track && typeof track.stop === "function") {
            track.stop();
          }
        });
      }
    }
    stream = null;
  }

  if (video.value) {
    video.value.srcObject = null;
  }

  if (apriltagWorker) {
    apriltagWorker.terminate();
    apriltagWorker = null;
    apriltag = null;
    detectorReady = false;
  }

  cameraReady.value = false;
  detectedTags.value = [];
};

/**
 * Handle close event
 */
const handleClose = () => {
  stopCamera();
  emit("close");
};

// Watch for show prop changes
watch(
  () => props.show,
  async (val) => {
    console.log("[CellarPhotoCapture] show prop changed:", val);
    if (val) {
      await nextTick();
      startCamera();
    } else {
      stopCamera();
    }
  }
);

onMounted(async () => {
  console.log("[CellarPhotoCapture] onMounted, show prop:", props.show);
  if (props.show) {
    await nextTick();
    startCamera();
  }
});

onUnmounted(() => {
  stopCamera();
});
</script>

<style scoped>
.fixed {
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
}
</style>
