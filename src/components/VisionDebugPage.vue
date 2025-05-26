<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 dark:from-gray-900/90 dark:via-gray-900/90 dark:to-purple-900/90 backdrop-blur-sm"
      @click="closeModal"
    >
      <div
        class="vision-debug-modal bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full h-[90vh] overflow-y-auto m-2"
        @click.stop
      >
        <header
          class="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700"
        >
          <h1 class="text-xl font-bold">Vision Debug</h1>
          <button
            class="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="closeModal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="w-6 h-6"
            >
              <path
                fill-rule="evenodd"
                d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </header>

        <section class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg m-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            This debug tool allows you to test ArUco marker detection using your
            device's camera. Point the camera at ArUco markers (4×4_50
            dictionary, IDs 0-15) to see them detected.
          </p>
          <div class="flex gap-4 mt-3">
            <div
              class="stat-item bg-white dark:bg-gray-700 rounded-lg p-3 flex-1 shadow-sm"
            >
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Markers
              </div>
              <div class="text-xl font-bold">{{ markerCount }}</div>
            </div>
            <div
              class="stat-item bg-white dark:bg-gray-700 rounded-lg p-3 flex-1 shadow-sm"
            >
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Accuracy
              </div>
              <div
                class="text-xl font-bold"
                :class="{
                  'text-green-500': accuracyLevel === 'HIGH',
                  'text-yellow-500': accuracyLevel === 'MEDIUM',
                  'text-orange-500': accuracyLevel === 'LOW',
                  'text-red-500': accuracyLevel === 'NONE',
                }"
              >
                {{ accuracyLevel }}
              </div>
            </div>
          </div>
        </section>

        <section class="camera-section p-4">
          <VisionCamera />
        </section>

        <section class="p-4">
          <h2 class="text-lg font-semibold mb-3">Detected Markers</h2>
          <div
            v-if="markerCount > 0"
            class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2"
          >
            <div
              v-for="marker in markersInView"
              :key="marker.id"
              class="marker-item bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm"
            >
              <div class="text-sm font-semibold">ID: {{ marker.id }}</div>
              <div
                class="text-xs text-gray-500 dark:text-gray-400 grid grid-cols-2 gap-1 mt-1"
              >
                <span v-for="(corner, idx) in marker.corners" :key="idx">
                  ({{ Math.round(corner[0]) }}, {{ Math.round(corner[1]) }})
                </span>
              </div>
            </div>
          </div>
          <div
            v-else
            class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400"
          >
            No markers detected. Try pointing the camera at an ArUco marker.
          </div>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useVisionStore } from "../stores/vision";
import VisionCamera from "../components/VisionCamera.vue";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

const visionStore = useVisionStore();

// Computed properties from the store
const markerCount = computed(() => visionStore.markerCount);
const markersInView = computed(() => visionStore.markersInView);
const accuracyLevel = computed(() => visionStore.accuracyLevel);

// Close modal
const closeModal = () => {
  emit("update:show", false);
};
</script>

<style scoped>
.vision-debug-modal {
  display: flex;
  flex-direction: column;
}

/* Mobile responsive adjustments */
@media (max-width: 640px) {
  .vision-debug-modal {
    height: 100vh;
    max-height: 100vh;
    width: 100%;
    margin: 0;
    border-radius: 0;
  }
}
</style>
