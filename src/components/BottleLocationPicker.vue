<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[70] flex items-center justify-center"
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black bg-opacity-75"
      @click="handleClose"
    ></div>

    <!-- Modal -->
    <div
      class="relative z-10 bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-700"
      >
        <h2 class="text-xl font-semibold text-white">Mark Bottle Location</h2>
        <button @click="handleClose" class="text-gray-400 hover:text-white">
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>

      <!-- Main content -->
      <div class="flex-1 overflow-hidden p-4 flex flex-col">
        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center h-64">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"
          ></div>
        </div>

        <!-- No photos available -->
        <div
          v-else-if="!selectedPhoto"
          class="flex flex-col items-center justify-center h-64 text-center"
        >
          <CameraIcon class="h-12 w-12 text-gray-500 mb-4" />
          <p class="text-gray-300 mb-4">
            No cellar photos available. Take a photo of your wine rack first.
          </p>
          <button
            @click="openCameraCapture"
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none"
          >
            Take Photo
          </button>
        </div>

        <!-- Photo picker and location marking interface -->
        <div v-else class="flex flex-col h-full">
          <!-- Photo selection if multiple photos available -->
          <div v-if="cellarPhotos.length > 1" class="mb-4">
            <label class="block text-sm font-medium text-gray-300 mb-1"
              >Select Cellar Photo</label
            >
            <select
              v-model="selectedPhotoId"
              class="w-full px-3 py-2 bg-gray-800 text-white rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option
                v-for="photo in cellarPhotos"
                :key="photo.id"
                :value="photo.id"
              >
                Photo from {{ new Date(photo.createdAt).toLocaleString() }}
              </option>
            </select>
          </div>

          <!-- Photo display and interactive area -->
          <div
            ref="photoContainer"
            class="relative flex-1 overflow-hidden rounded-md"
          >
            <!-- Background image -->
            <img
              v-if="photoUrl"
              :src="photoUrl"
              ref="photoElement"
              class="max-w-full max-h-[60vh] mx-auto"
              @load="onPhotoLoad"
              @click="handlePhotoClick"
              :style="{ cursor: 'crosshair' }"
            />

            <!-- Marker for selected location -->
            <div
              v-if="markerPosition.x !== null && markerPosition.y !== null"
              class="absolute pointer-events-none"
              :style="{
                left: `${markerPosition.x}px`,
                top: `${markerPosition.y}px`,
                transform: 'translate(-50%, -50%)',
              }"
            >
              <div
                class="w-6 h-6 rounded-full bg-purple-500 bg-opacity-50 flex items-center justify-center"
              >
                <div
                  class="w-4 h-4 rounded-full bg-purple-500 animate-pulse"
                ></div>
              </div>
              <!-- Crosshair lines -->
              <div
                class="absolute left-1/2 top-0 w-0.5 h-full -translate-x-1/2 bg-purple-500 opacity-50"
              ></div>
              <div
                class="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-purple-500 opacity-50"
              ></div>
            </div>
            <!-- Magnifier glass (optional) -->
            <div
              v-if="
                showMagnifier &&
                magnifierPosition.x !== null &&
                markerPosition.x !== null &&
                markerPosition.y !== null &&
                magnifierPosition.y !== null
              "
              class="absolute pointer-events-none w-24 h-24 rounded-full border-2 border-white shadow-lg overflow-hidden"
              :style="{
                left: `${magnifierPosition.x}px`,
                top: `${magnifierPosition.y}px`,
                transform: 'translate(-50%, -50%)',
                backgroundImage: photoUrl ? `url(${photoUrl})` : 'none',
                // Calculate mouse position relative to image
                ...(() => {
                  const rect = photoRect as DOMRect | null;
                  if (!rect) return {};
                  const relX = magnifierPosition.x - rect.left;
                  const relY = magnifierPosition.y - rect.top;
                  const percentX = (relX / rect.width) * 100;
                  const percentY = (relY / rect.height) * 100;
                  return {
                    backgroundPosition: `${percentX}% ${percentY}%`,
                    backgroundSize: '200%',
                    display: photoUrl ? 'block' : 'none',
                  };
                })(),
              }"
            ></div>
          </div>

          <!-- Instructions -->
          <div class="mt-4 p-3 bg-gray-800 rounded-md text-gray-300 text-sm">
            <p>
              Click on the exact location of the bottle in the photo. This will
              help you find it later.
            </p>
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="p-4 border-t border-gray-700 flex justify-between">
        <button
          @click="handleClose"
          class="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none"
        >
          Cancel
        </button>
        <button
          @click="saveLocation"
          :disabled="markerPosition.x === null || !selectedPhoto"
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Location
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { XMarkIcon, CameraIcon } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import {
  getAllCellarPhotos,
  getCellarPhoto,
  createCellarPhotoUrl,
} from "../services/cellar-photo-storage";
import type { CellarPhoto } from "../shared/types";
import type { BottleLocation } from "../shared/Wine";

const props = defineProps<{
  show: boolean;
  wineId?: string;
  initialTagId?: number;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "location-selected", location: BottleLocation): void;
  (e: "take-photo"): void;
}>();

// State
const loading = ref(true);
const cellarPhotos = ref<CellarPhoto[]>([]);
const selectedPhotoId = ref<string | null>(null);
const selectedPhoto = computed(() =>
  cellarPhotos.value.find((photo) => photo.id === selectedPhotoId.value)
);
const photoUrl = ref<string | null>(null);
const photoElement = ref<HTMLImageElement | null>(null);
const photoContainer = ref<HTMLDivElement | null>(null);
const photoRect = ref<DOMRect | null>(null);

// Location marker state
const markerPosition = ref({
  x: null as number | null,
  y: null as number | null,
});
const normalizedPosition = computed(() => {
  if (
    markerPosition.value.x === null ||
    markerPosition.value.y === null ||
    !photoRect.value ||
    !selectedPhoto.value
  ) {
    return { x: 0, y: 0 };
  }

  // Calculate normalized coordinates (0-1)
  const x =
    (markerPosition.value.x - photoRect.value.left) / photoRect.value.width;
  const y =
    (markerPosition.value.y - photoRect.value.top) / photoRect.value.height;

  return { x, y };
});

// Magnifier feature
const showMagnifier = ref(false);
const magnifierPosition = ref({
  x: null as number | null,
  y: null as number | null,
});

// Close on escape key
useEscapeKey(() => {
  if (props.show) {
    handleClose();
  }
});

// Load photos on mount

onMounted(async () => {
  if (props.show) await loadCellarPhotos();
});

// Watch for show prop to reload photos when modal opens
watch(
  () => props.show,
  async (val) => {
    if (val) {
      await loadCellarPhotos();
    }
  }
);

// Cleanup on unmount
onBeforeUnmount(() => {
  if (photoUrl.value) {
    URL.revokeObjectURL(photoUrl.value);
  }
});

// Watch for photo selection change
watch(selectedPhotoId, async (newId) => {
  if (photoUrl.value) {
    URL.revokeObjectURL(photoUrl.value);
    photoUrl.value = null;
  }

  if (newId) {
    loadSelectedPhoto(newId);
  }

  // Reset marker position
  markerPosition.value = { x: null, y: null };
});

// Load all available cellar photos
async function loadCellarPhotos() {
  loading.value = true;
  try {
    cellarPhotos.value = await getAllCellarPhotos();

    // Auto-select the most recent photo if available
    if (cellarPhotos.value.length > 0) {
      selectedPhotoId.value = cellarPhotos.value[0].id;
    }
  } catch (error) {
    console.error("Failed to load cellar photos:", error);
  } finally {
    loading.value = false;
  }
}

// Load the selected photo
async function loadSelectedPhoto(photoId: string) {
  loading.value = true;
  try {
    const photo = await getCellarPhoto(photoId);
    if (photo) {
      photoUrl.value = createCellarPhotoUrl(photo);
    }
  } catch (error) {
    console.error("Failed to load selected photo:", error);
  } finally {
    loading.value = false;
  }
}

// Handle photo click to set marker position
function handlePhotoClick(event: MouseEvent) {
  if (photoElement.value) {
    photoRect.value = photoElement.value.getBoundingClientRect();
    markerPosition.value = {
      x: event.clientX,
      y: event.clientY,
    };

    // Position magnifier
    updateMagnifierPosition(event);
    showMagnifier.value = true;
  }
}

// Update magnifier position on mouse move
function updateMagnifierPosition(event: MouseEvent) {
  magnifierPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };
}

// Handle photo load event
function onPhotoLoad() {
  if (photoElement.value) {
    photoRect.value = photoElement.value.getBoundingClientRect();

    // Add mousemove listener for magnifier
    photoElement.value.addEventListener("mousemove", updateMagnifierPosition);
  }
}

// Save bottle location
function saveLocation() {
  if (
    selectedPhoto.value &&
    markerPosition.value.x !== null &&
    markerPosition.value.y !== null
  ) {
    const location: BottleLocation = {
      tagId: props.initialTagId || 0, // Use a default tag ID if not provided
      x: normalizedPosition.value.x,
      y: normalizedPosition.value.y,
      cellPhotoId: selectedPhoto.value.id,
    };

    emit("location-selected", location);
    handleClose();
  }
}

// Open camera capture component
function openCameraCapture() {
  emit("take-photo");
}

// Close the picker
function handleClose() {
  // Clean up
  if (photoUrl.value) {
    URL.revokeObjectURL(photoUrl.value);
    photoUrl.value = null;
  }

  if (photoElement.value) {
    photoElement.value.removeEventListener(
      "mousemove",
      updateMagnifierPosition
    );
  }

  emit("close");
}
</script>
