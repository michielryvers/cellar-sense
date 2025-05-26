<template>
  <Teleport to="body">
    <div class="find-view fixed inset-0 z-50 bg-black">
      <!-- Close button -->
      <button
        @click="closeView"
        class="absolute top-4 right-4 p-2 bg-gray-800 bg-opacity-50 rounded-full text-white hover:bg-opacity-75 z-10"
        aria-label="Close AR view"
      >
        <XMarkIcon class="h-6 w-6" />
      </button>
      <!-- Permission denied notice -->
      <div
        v-if="permissionDenied"
        class="flex items-center justify-center w-full h-full"
      >
        <p class="text-white text-lg">Camera permissions denied</p>
      </div>
      <!-- AR view -->
      <div v-else class="relative w-full h-full">
        <video
          ref="video"
          class="w-full h-full object-cover"
          autoplay
          muted
          playsinline
        ></video>
        <canvas
          ref="overlay"
          class="absolute inset-0 w-full h-full pointer-events-none"
        ></canvas>
        <div
          v-if="accuracyLevel !== 'HIGH'"
          class="banner absolute top-0 left-0 w-full bg-yellow-200 text-black text-center py-2"
        >
          Tip: capture more tags for higher precision
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { ref, onMounted, onUnmounted, computed, nextTick } from "vue";
import { useVisionStore } from "../stores/vision";
import { detectTags } from "../vision/aruco";
import { ARGuidanceService } from "../services/ar-guidance-service";
import { db } from "../services/dexie-db";
import type { Wine } from "../shared/Wine";
import type { RackDefinition } from "../shared/types/vision";

const props = defineProps<{ wineId: string }>();
const emit = defineEmits<{
  (e: "close"): void;
}>();
const video = ref<HTMLVideoElement | null>(null);
const overlay = ref<HTMLCanvasElement | null>(null);
const visionStore = useVisionStore();
const accuracyLevel = computed(() => visionStore.accuracyLevel);

const guidance = new ARGuidanceService();
const wine = ref<Wine | null>(null);
const rackDef = ref<RackDefinition | null>(null);
let animationId = 0;
let frameCount = 0;

const permissionDenied = ref(false);
async function startPreview() {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (error: any) {
    console.error("Camera access denied:", error);
    permissionDenied.value = true;
    return;
  }
  if (video.value) video.value.srcObject = stream;
  await new Promise((res) =>
    video.value?.addEventListener("loadedmetadata", res, { once: true })
  );

  const width = video.value!.videoWidth;
  const height = video.value!.videoHeight;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d")!;

  const ov = overlay.value!;
  ov.width = width;
  ov.height = height;
  const octx = ov.getContext("2d")!;

  const loop = async () => {
    frameCount++;

    // Only process every 3rd frame
    if (frameCount % 3 === 0) {
      tempCtx.drawImage(video.value!, 0, 0, width, height);
      const imageData = tempCtx.getImageData(0, 0, width, height);
      const tags = await detectTags(imageData);
      visionStore.update(tags);
      octx.clearRect(0, 0, width, height);

      if (wine.value?.location && rackDef.value && tags.length > 0) {
        const p = await guidance.project(
          wine.value.location,
          tags,
          rackDef.value
        );

        if (p) {
          const r = width * 0.04;
          octx.fillStyle = "#00C85366"; // Fixed typo: was missing a '3'
          octx.strokeStyle = "#00C853";
          octx.lineWidth = 3;
          octx.beginPath();
          octx.arc(p.x, p.y, r, 0, 2 * Math.PI);
          octx.fill();
          octx.stroke();
        }
      }
    }

    animationId = requestAnimationFrame(loop);
  };
  loop();
}

onMounted(async () => {
  const wineRecord = await db.wines.get(props.wineId);
  if (!wineRecord || !wineRecord.location) {
    alert("No saved position for this wine");
    return;
  }
  wine.value = wineRecord;
  const def = await db.cellarVisionDefinition.get(wineRecord.location.rackId);
  if (!def) {
    alert("Calibration data not found for this rack");
    return;
  }
  rackDef.value = def;
  // Wait for DOM refs (video, overlay) to be rendered
  await nextTick();
  startPreview();
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  if (video.value?.srcObject) {
    (video.value.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
  }
});

/**
 * Close AR guidance view
 */
function closeView(): void {
  emit("close");
}
</script>

<style scoped>
.find-view {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 50;
  background-color: black;
}
video {
  display: block;
}
canvas {
  position: absolute;
  top: 0;
  left: 0;
}
.banner {
  background-color: rgba(255, 235, 59, 0.5);
}
</style>
