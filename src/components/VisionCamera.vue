<template>
  <div class="camera-container" ref="cameraContainer">
    <video
      ref="videoElement"
      class="camera-feed"
      autoplay
      playsinline
      muted
    ></video>
    <div class="camera-overlay" v-if="isProcessing">
      <div class="camera-info">
        <div class="tag-info">
          <span class="tag-count">{{ markerCount }}</span>
          <span class="tag-label">markers detected</span>
        </div>
        <div class="accuracy-level" :class="accuracyLevelClass">
          Accuracy: {{ accuracyLevel }}
        </div>
        <div v-if="markerIds.length > 0" class="tag-ids">
          IDs: {{ markerIds.join(", ") }}
        </div>
      </div>
    </div>
    <div class="camera-controls">
      <button
        @click="toggleProcessing"
        class="button"
        :class="{ 'button-active': isProcessing }"
      >
        {{ isProcessing ? "Pause" : "Start" }} Detection
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useVisionStore } from "../stores/vision";
import { detectTags } from "../vision/aruco";

const props = defineProps({
  width: {
    type: Number,
    default: 640,
  },
  height: {
    type: Number,
    default: 480,
  },
});

// References
const videoElement = ref<HTMLVideoElement | null>(null);
const cameraContainer = ref<HTMLDivElement | null>(null);
const stream = ref<MediaStream | null>(null);
const isProcessing = ref(false);
const animationFrameId = ref<number | null>(null);
const visionStore = useVisionStore();

// Computed properties
const markerCount = computed(() => visionStore.markerCount);
const markerIds = computed(() => visionStore.markerIds);
const accuracyLevel = computed(() => visionStore.accuracyLevel);
const accuracyLevelClass = computed(() => {
  switch (visionStore.accuracyLevel) {
    case "HIGH":
      return "level-high";
    case "MEDIUM":
      return "level-medium";
    case "LOW":
      return "level-low";
    default:
      return "level-none";
  }
});

// Methods
const startCamera = async () => {
  try {
    // Request camera access
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: props.width },
        height: { ideal: props.height },
        facingMode: "environment",
      },
    });

    // Set video source
    if (videoElement.value) {
      videoElement.value.srcObject = stream.value;
    }
  } catch (error) {
    console.error("Error accessing camera:", error);
  }
};

const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop());
    stream.value = null;
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }
};

const processVideoFrame = async () => {
  if (!isProcessing.value || !videoElement.value) {
    return;
  }

  try {
    const video = videoElement.value;

    // Only process if video is playing
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Create a canvas to capture the video frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw the current video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Detect ArUco markers
        const tags = await detectTags(imageData);

        // Update store with detected tags
        visionStore.update(tags);
      }
    }
  } catch (error) {
    console.error("Error processing video frame:", error);
  }

  // Continue processing frames
  animationFrameId.value = requestAnimationFrame(processVideoFrame);
};

const toggleProcessing = () => {
  isProcessing.value = !isProcessing.value;

  if (isProcessing.value) {
    processVideoFrame();
  } else if (animationFrameId.value !== null) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = null;
  }
};

// Lifecycle hooks
onMounted(() => {
  startCamera();
});

onUnmounted(() => {
  if (animationFrameId.value !== null) {
    cancelAnimationFrame(animationFrameId.value);
  }
  stopCamera();
});
</script>

<style scoped>
.camera-container {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.camera-feed {
  width: 100%;
  height: auto;
  display: block;
}

.camera-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 16px;
  pointer-events: none;
}

.camera-info {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  width: fit-content;
}

.tag-info {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.tag-count {
  font-size: 24px;
  font-weight: bold;
  margin-right: 8px;
}

.tag-label {
  font-size: 14px;
}

.tag-ids {
  font-size: 12px;
  margin-top: 4px;
}

.accuracy-level {
  font-size: 14px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 4px;
}

.level-high {
  background-color: #00c853;
  color: white;
}

.level-medium {
  background-color: #ffab00;
  color: black;
}

.level-low {
  background-color: #ff6d00;
  color: white;
}

.level-none {
  background-color: #b00020;
  color: white;
}

.camera-controls {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 16px;
}

.button {
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.button:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

.button-active {
  background-color: #2196f3;
}

.button-active:hover {
  background-color: #1976d2;
}
</style>
