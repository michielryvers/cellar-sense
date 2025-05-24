<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex flex-col h-full bg-black bg-opacity-95"
  >
    <header
      class="flex items-center justify-between p-4 bg-black bg-opacity-80"
    >
      <span class="text-white font-semibold text-lg">Camera</span>
      <button
        @click="$emit('close')"
        class="text-white bg-gray-800 bg-opacity-70 rounded-full p-2 hover:bg-gray-700 focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </header>
    <div class="flex-1 relative">
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
      <!-- Hidden canvas for grayscale extraction only -->
      <canvas ref="canvas" width="1024" height="768" class="hidden"></canvas>
      <!-- Overlay canvas for tag drawing, absolutely positioned over video -->
      <canvas
        ref="overlayCanvas"
        width="1024"
        height="768"
        class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        style="width: 1024px; height: 768px"
      ></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";

// Dynamically import Comlink for worker communication
let Comlink: any = null;
import("comlink").then((mod) => {
  Comlink = mod.default || mod;
});

// Path to the Apriltag worker (relative to public/)
const APRILTAG_WORKER_PATH = "ApriltagWorker.js";

let apriltagWorker: Worker | null = null;
let apriltag: any = null;
let detectorReady = false;
let lastDetections: any[] = [];

const props = defineProps<{ show: boolean }>();
const emit = defineEmits(["close"]);

const video = ref<HTMLVideoElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null); // for grayscale extraction only
const overlayCanvas = ref<HTMLCanvasElement | null>(null); // for overlays
let stream: MediaStream | null = null;

// Helper: Convert video frame to grayscale Uint8Array
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

const startCamera = async () => {
  console.log("[FullScreenCamera] startCamera called");
  if (!video.value) {
    console.log("[FullScreenCamera] video ref not ready");
    return;
  }
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera API not supported in this browser.");
      emit("close");
      return;
    }
    console.log("[FullScreenCamera] Requesting getUserMedia...");
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1024 },
        height: { ideal: 768 },
        facingMode: "environment",
      },
    });
    console.log("[FullScreenCamera] getUserMedia success", stream);
    video.value.srcObject = stream;
    // Try to play the video (required on some browsers)
    try {
      await video.value.play();
      console.log("[FullScreenCamera] video.play() success");
      // Start Apriltag detection loop if worker is ready
      if (!apriltagWorker) {
        apriltagWorker = new Worker(APRILTAG_WORKER_PATH);
        // Wait for Comlink to be loaded
        while (!Comlink) await new Promise((r) => setTimeout(r, 10));
        apriltag = Comlink.wrap(apriltagWorker);
        // Wait for detector to be ready (calls init method)
        await apriltag.init(new Comlink.proxy(() => {}));
        detectorReady = true;
      }
      runApriltagDetection();
    } catch (err) {
      console.error("[FullScreenCamera] Video play() failed", err);
    }
  } catch (e) {
    console.error("[FullScreenCamera] Camera error", e);
    emit("close");
  }
};

// Detection loop
async function runApriltagDetection() {
  if (
    !video.value ||
    !canvas.value ||
    !overlayCanvas.value ||
    !apriltag ||
    !detectorReady
  )
    return;
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
      lastDetections = detections;
      // Draw detections on overlay canvas
      if (overlayCanvas.value) {
        // Always clear overlay
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
              console.info("[Apriltag] Detected tag:", det);
              if (det.corners && det.corners.length === 4) {
                // Draw outline
                ctx.beginPath();
                ctx.moveTo(det.corners[0].x, det.corners[0].y);
                for (let i = 1; i < 4; i++) {
                  ctx.lineTo(det.corners[i].x, det.corners[i].y);
                }
                ctx.closePath();
                ctx.stroke();

                // Draw colored circles at each corner
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

                // Draw tag ID at center
                if (det.center) {
                  ctx.fillStyle = "yellow";
                  ctx.fillText(`ID: ${det.id}`, det.center.x, det.center.y);
                }
              }
            });
          }
        }
      }
    } catch (e) {
      const err = e as any;
      if (err && err.message && err.message.includes("WASM module not ready")) {
        setTimeout(runApriltagDetection, 500);
        return;
      }
      console.error("[Apriltag] Detection error", e);
    }
  }
  requestAnimationFrame(runApriltagDetection);
}

const stopCamera = () => {
  if (stream) {
    // Defensive: check for getTracks and stop
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
};

watch(
  () => props.show,
  async (val) => {
    console.log("[FullScreenCamera] show prop changed:", val);
    if (val) {
      await nextTick();
      startCamera();
    } else {
      stopCamera();
    }
  }
);

onMounted(async () => {
  console.log("[FullScreenCamera] onMounted, show prop:", props.show);
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
