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
      class="relative z-10 bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] flex flex-col"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-700"
      >
        <h2 class="text-xl font-semibold text-white">Set Bottle Location</h2>
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
        <!-- Error state -->
        <div
          v-else-if="error"
          data-testid="error-state"
          class="flex flex-col items-center justify-center h-64 text-center"
        >
          <ExclamationTriangleIcon class="h-12 w-12 text-red-500 mb-4" />
          <p class="text-red-400 mb-4">{{ error }}</p>
          <button
            @click="loadRackDefinition"
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none"
          >
            Retry
          </button>
        </div>

        <!-- Calibration image display and interactive area -->
        <div
          v-else-if="calibrationImageUrl"
          ref="imageContainer"
          class="relative flex-1 overflow-hidden rounded-md"
        >
          <!-- Background calibration image -->
          <img
            :src="calibrationImageUrl"
            ref="imageElement"
            class="max-w-full max-h-[70vh] mx-auto cursor-crosshair object-contain"
            @load="onImageLoad"
            @click="handleImageClick"
            @mousemove="handleMouseMove"
            @mouseleave="hideMagnifier"
            alt="Rack calibration image"
          />          <!-- Marker for selected location -->
          <div
            v-if="markerPosition.x !== null && markerPosition.y !== null && imageElement && imageRect"
            class="absolute pointer-events-none"
            :style="{
              left: `${(markerPosition.x / imageElement.naturalWidth) * imageRect.width}px`,
              top: `${(markerPosition.y / imageElement.naturalHeight) * imageRect.height}px`,
            }"
          >
            <div
              class="w-8 h-8 rounded-full bg-green-500 bg-opacity-70 flex items-center justify-center"
              :style="{ backgroundColor: GUIDANCE_COLOR }"
            >
              <div
                class="w-6 h-6 rounded-full animate-pulse"
                :style="{ backgroundColor: GUIDANCE_COLOR }"
              ></div>
            </div>
            <!-- Crosshair lines -->
            <div
              class="absolute left-1/2 top-0 w-0.5 h-full -translate-x-1/2 opacity-70"
              :style="{ backgroundColor: GUIDANCE_COLOR }"
            ></div>
            <div
              class="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 opacity-70"
              :style="{ backgroundColor: GUIDANCE_COLOR }"
            ></div>
          </div>

          <!-- Magnifier glass -->
          <div
            v-if="
              showMagnifier &&
              magnifierPosition.x !== null &&
              magnifierPosition.y !== null
            "
            class="absolute pointer-events-none w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden z-50"
            :style="{
              left: `${magnifierPosition.x}px`,
              top: `${magnifierPosition.y}px`,
              transform: 'translate(-50%, -50%)',
              backgroundImage: calibrationImageUrl
                ? `url(${calibrationImageUrl})`
                : 'none',
              ...(() => {
                const rect = imageRect;
                if (!rect || !calibrationImageUrl) return {};
                const relX = magnifierPosition.x - rect.left;
                const relY = magnifierPosition.y - rect.top;
                const percentX = (relX / rect.width) * 100;
                const percentY = (relY / rect.height) * 100;
                return {
                  backgroundPosition: `${percentX}% ${percentY}%`,
                  backgroundSize: '300%', // 3x zoom
                  display: calibrationImageUrl ? 'block' : 'none',
                };
              })(),
            }"
          >
            <!-- Crosshairs in magnifier -->
            <div
              class="absolute left-1/2 top-0 w-0.5 h-full -translate-x-1/2 bg-white opacity-70"
            ></div>
            <div
              class="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-white opacity-70"
            ></div>
          </div>
        </div>

        <!-- Instructions -->
        <div
          v-if="calibrationImageUrl"
          class="mt-4 p-3 bg-gray-800 rounded-md text-gray-300 text-sm"
        >
          <p>
            Click on the exact location of the bottle in the rack calibration
            image. The green circle will help you find this bottle later using
            AR guidance.
          </p>
          <p class="mt-2 text-xs text-gray-400">
            Coordinates will be normalized relative to the rack markers for
            accurate positioning.
          </p>
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
          :disabled="markerPosition.x === null || !rackDefinition"
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
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import { getRack, saveWineLocation } from "../services/dexie-db";
import { GUIDANCE_COLOR } from "../services/calibration-service";
import type { RackDefinition, WineLocation } from "../shared/types/vision";

const props = defineProps<{
  show: boolean;
  rackId: string;
  wineId: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "location-saved", location: WineLocation): void;
}>();

// State
const loading = ref(true);
const error = ref<string>("");
const rackDefinition = ref<RackDefinition | null>(null);
const calibrationImageUrl = computed(
  () => rackDefinition.value?.calibrationImageUrl || null
);
const imageElement = ref<HTMLImageElement | null>(null);
const imageContainer = ref<HTMLDivElement | null>(null);
const imageRect = ref<DOMRect | null>(null);

// Location marker state
const markerPosition = ref({
  x: null as number | null,
  y: null as number | null,
});

// Magnifier feature
const showMagnifier = ref(false);
const magnifierPosition = ref({
  x: null as number | null,
  y: null as number | null,
});

// Computed normalized position
const normalizedPosition = computed(() => {
  if (
    markerPosition.value.x === null ||
    markerPosition.value.y === null ||
    !imageElement.value
  ) {
    return { x: 0, y: 0 };
  }

  // Calculate normalized coordinates (0-1) relative to the image's actual pixel content
  const img = imageElement.value;
  const x = markerPosition.value.x / img.naturalWidth;
  const y = markerPosition.value.y / img.naturalHeight;

  return { x, y };
});

// Close on escape key
useEscapeKey(() => {
  if (props.show) {
    handleClose();
  }
});

// Load rack definition on mount and when props change
onMounted(async () => {
  if (props.show && props.rackId) {
    await loadRackDefinition();
  }
  
  // Add window resize listener to update image rect
  window.addEventListener('resize', updateImageRect);
});

// Watch for show prop and rackId changes
watch([() => props.show, () => props.rackId], async ([show, rackId]) => {
  if (show && rackId) {
    await loadRackDefinition();
  }
});

// Load the rack definition
async function loadRackDefinition() {
  if (!props.rackId) {
    error.value = "No rack ID provided";
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const rack = await getRack(props.rackId);
    if (rack) {
      rackDefinition.value = rack;
    } else {
      error.value =
        "Rack definition not found. Please calibrate your rack first.";
    }
  } catch (err) {
    console.error("Failed to load rack definition:", err);
    error.value = "Failed to load rack definition. Please try again.";
  } finally {
    loading.value = false;
  }
}

// Handle image click to set marker position
function handleImageClick(event: MouseEvent) {
  if (imageElement.value) {
    // Ensure imageRect is updated
    imageRect.value = imageElement.value.getBoundingClientRect();
    
    // Convert click coordinates from displayed size to natural image coordinates
    const img = imageElement.value;
    const rect = imageRect.value;
    
    if (!rect) return; // Safety check
    
    // Calculate scale factors between displayed and natural image size
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    
    // Scale the click coordinates to natural image coordinates
    markerPosition.value = {
      x: event.offsetX * scaleX,
      y: event.offsetY * scaleY,
    };

    // Position magnifier directly over the click point
    // For the overlay, we need viewport coordinates
    updateMagnifierPosition(event);
    showMagnifier.value = true;

    // Hide magnifier after a short delay
    setTimeout(() => {
      showMagnifier.value = false;
    }, 2000);
  }
}

// Handle mouse move for magnifier
function handleMouseMove(event: MouseEvent) {
  updateMagnifierPosition(event);
  showMagnifier.value = true;
}

// Hide magnifier
function hideMagnifier() {
  showMagnifier.value = false;
}

// Update magnifier position
function updateMagnifierPosition(event: MouseEvent) {
  // Position the magnifier directly at the cursor position
  // Using clientX/Y for viewport coordinates
  magnifierPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };
}

// Handle image load event
function onImageLoad() {
  updateImageRect();
}

// Update image rectangle (for resize events)
function updateImageRect() {
  if (imageElement.value) {
    imageRect.value = imageElement.value.getBoundingClientRect();
  }
}

// Save bottle location
async function saveLocation() {
  if (
    !rackDefinition.value ||
    markerPosition.value.x === null ||
    markerPosition.value.y === null ||
    !props.wineId
  ) {
    return;
  }

  try {
    const location: WineLocation = {
      rackId: props.rackId,
      x: normalizedPosition.value.x,
      y: normalizedPosition.value.y,
    };

    await saveWineLocation(props.wineId, location);
    emit("location-saved", location);
    handleClose();
  } catch (err) {
    console.error("Failed to save wine location:", err);
    error.value = "Failed to save location. Please try again.";
  }
}

// Close the picker
function handleClose() {
  // Reset state
  markerPosition.value = { x: null, y: null };
  magnifierPosition.value = { x: null, y: null };
  showMagnifier.value = false;
  error.value = "";

  emit("close");
}

// Cleanup on unmount
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateImageRect);
});
</script>
