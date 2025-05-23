<template>
  <div v-if="show" class="ar-view-container">
    <div class="header">
      <h1 class="title">AR Vision Overlay</h1>
      <button @click="closeView" class="back-button">
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
    </div>

    <div class="camera-container">
      <CameraView
        ref="cameraViewRef"
        :width="640"
        :height="480"
        :debug="true"
        :frame-skip="1"
        :auto-start="true"
        :show-overlay="showOverlay"
      />
    </div>

    <div class="controls">
      <div class="pose-info" v-if="poseStore.hasValidPose">
        <div class="tag-id">Tag ID: {{ poseStore.state.detection?.id }}</div>
        <div class="quality" :class="poseStore.state.quality">
          Quality: {{ poseStore.state.quality.toUpperCase() }}
        </div>
        <div class="fps">FPS: {{ poseStore.state.fps }}</div>
      </div>
      <div class="buttons">
        <button
          @click="toggleCamera"
          class="control-button"
          :class="{ active: isActive }"
        >
          {{ isActive ? "Stop Camera" : "Start Camera" }}
        </button>
        <button
          @click="showOverlay = !showOverlay"
          class="control-button"
          :class="{ active: showOverlay }"
        >
          {{ showOverlay ? "Hide Overlay" : "Show Overlay" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import CameraView from "../components/CameraView.vue";
import { usePoseStore } from "../stores/poseStore";

// Props and emits
const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
}>();

// Refs
const cameraViewRef = ref<InstanceType<typeof CameraView> | null>(null);
const showOverlay = ref<boolean>(true);

// Stores
const poseStore = usePoseStore();

// Computed
const isActive = computed(() => cameraViewRef.value?.isActive || false);

// Methods
function toggleCamera() {
  if (isActive.value) {
    cameraViewRef.value?.stopCamera();
  } else {
    cameraViewRef.value?.startCamera();
  }
}

function closeView() {
  // Stop camera before closing
  if (cameraViewRef.value?.isActive) {
    cameraViewRef.value?.stopCamera();
  }

  // Emit event to close
  emit("update:show", false);
}

// Watch for show changes
watch(
  () => props.show,
  (newVal) => {
    if (newVal && cameraViewRef.value && !cameraViewRef.value.isActive) {
      // Auto-start camera when opened
      setTimeout(() => {
        cameraViewRef.value?.startCamera();
      }, 300);
    } else if (!newVal && cameraViewRef.value?.isActive) {
      // Stop camera when closed
      cameraViewRef.value.stopCamera();
    }
  }
);

onMounted(() => {
  console.log("ARView mounted, show:", props.show);
});
</script>

<style scoped>
.ar-view-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #121212;
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.title {
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
}

.back-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.camera-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.controls {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
}

.pose-info {
  display: flex;
  justify-content: space-between;
  color: white;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.quality {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: bold;
}

.quality.green {
  background-color: #10b981;
}

.quality.amber {
  background-color: #f59e0b;
}

.quality.red {
  background-color: #ef4444;
}

.buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.control-button {
  background-color: #7c3aed;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-button:hover {
  background-color: #6d28d9;
}

.control-button.active {
  background-color: #ef4444;
}

.control-button.active:hover {
  background-color: #dc2626;
}
</style>
