<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { XMarkIcon, PencilIcon, MapPinIcon } from "@heroicons/vue/24/outline";
import { StarIcon } from "@heroicons/vue/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import { saveWineLocation, getAllRacks } from "../services/dexie-db";
import { Wine } from "../shared/Wine";
import type { WineDetailProps } from "../shared/types";
import type { WineLocation, RackDefinition } from "../shared/types/vision";
import LocationPicker from "./LocationPicker.vue";
import FindBottleView from "./FindBottleView.vue";

const props = defineProps<WineDetailProps>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "edit", wine: Wine): void;
}>();

// LocationPicker state
const showLocationPicker = ref(false);
// Find Bottle modal
const showFindModal = ref(false);
const availableRacks = ref<RackDefinition[]>([]);
const defaultRackId = ref<string>("");

// Load available racks on mount
onMounted(async () => {
  try {
    const racks = await getAllRacks();
    availableRacks.value = racks;

    // If there's only one rack, use it as default
    if (racks.length === 1) {
      defaultRackId.value = racks[0].id;
    }
  } catch (error) {
    console.error("Failed to load rack definitions:", error);
  }
});
// Determine if wine's rack is available
const rackExists = computed(() => {
  return !!(
    props.wine.location &&
    availableRacks.value.some((r) => r.id === props.wine.location!.rackId)
  );
});

// Handle setting bottle location
async function handleSetLocation(): Promise<void> {
  // Only proceed if we have at least one rack available
  if (availableRacks.value.length === 0) {
    console.warn(
      "No rack definitions available. Please calibrate a rack first."
    );
    return;
  }

  showLocationPicker.value = true;
}

// Handle finding bottle
function handleFindBottle(): void {
  if (!props.wine.location) {
    alert("No saved position for this wine");
    handleSetLocation();
    return;
  }
  if (!rackExists.value) {
    alert("Calibration data not found for this rack");
    return;
  }
  // Close detail modal and open AR guidance
  closeModal();
  showFindModal.value = true;
}
async function handleLocationSaved(location: WineLocation): Promise<void> {
  if (props.wine.id) {
    try {
      await saveWineLocation(props.wine.id, location);
      // Update the wine object locally to reflect the change
      if (props.wine) {
        (props.wine as any).location = location;
      }
      showLocationPicker.value = false;
    } catch (error) {
      console.error("Failed to save wine location:", error);
    }
  }
}

function handleCloseLocationPicker(): void {
  showLocationPicker.value = false;
}

// Image URLs computed properties
const frontImageUrl = computed(() => {
  if (!props.wine.images?.front) return null;
  if (
    typeof props.wine.images.front === "string" &&
    props.wine.images.front.startsWith("data:")
  ) {
    return props.wine.images.front;
  }
  if (props.wine.images.front instanceof Blob) {
    return URL.createObjectURL(props.wine.images.front);
  }
  return null;
});

const backImageUrl = computed(() => {
  if (!props.wine.images?.back) return null;
  if (
    typeof props.wine.images.back === "string" &&
    props.wine.images.back.startsWith("data:")
  ) {
    return props.wine.images.back;
  }
  if (props.wine.images.back instanceof Blob) {
    return URL.createObjectURL(props.wine.images.back);
  }
  return null;
});

// Wine data computed properties
const grapesList = computed(() => {
  if (!props.wine.grapes) return [];
  return props.wine.grapes;
});

const vinificationSteps = computed(() => {
  if (!props.wine.vinification) return [];
  return props.wine.vinification;
});

const consumptionHistory = computed(() => {
  if (!props.wine.consumptions) return [];
  // Sort by date descending (most recent first)
  return [...props.wine.consumptions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
});

const averageRating = computed(() => {
  if (!props.wine.consumptions || props.wine.consumptions.length === 0)
    return 0;

  const sum = props.wine.consumptions.reduce(
    (acc, consumption) => acc + consumption.rating,
    0
  );
  return Math.round((sum / props.wine.consumptions.length) * 10) / 10; // Round to 1 decimal place
});

// Event handlers
function handleEdit(): void {
  emit("edit", props.wine);
  emit("update:show", false);
}

function closeModal(): void {
  emit("update:show", false);
}

function handleOutsideClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    closeModal();
  }
}

// Use escape key to close modal
useEscapeKey(closeModal);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 dark:from-gray-900/90 dark:via-gray-900/90 dark:to-purple-900/90 backdrop-blur-sm"
      @click="handleOutsideClick"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative"
      >
        <!-- Header -->
        <div
          class="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4"
        >
          <div>
            <h2
              class="text-2xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
            >
              {{ wine.name || "Unnamed Wine" }}
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              {{ wine.vintner || "" }}
              {{ wine.vintage ? `(${wine.vintage})` : "" }}
            </p>
          </div>
          <div class="flex gap-2">
            <!-- Set Location button (show if no location) -->
            <button
              v-if="!props.wine.location"
              @click="handleSetLocation"
              class="inline-flex items-center px-4 py-2 text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 rounded-lg shadow-md transition-all transform hover:scale-105"
            >
              <MapPinIcon class="h-4 w-4 mr-2" />
              Set Location
            </button>
            <!-- Find Bottle button (show if location exists and rack present) -->
            <button
              v-if="props.wine.location && rackExists"
              @click="handleFindBottle"
              class="inline-flex items-center px-4 py-2 text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 rounded-lg shadow-md transition-all transform hover:scale-105"
            >
              <MapPinIcon class="h-4 w-4 mr-2" />
              Find Bottle
            </button>
            <button
              @click="handleEdit"
              class="inline-flex items-center px-4 py-2 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 rounded-lg shadow-md transition-all transform hover:scale-105"
            >
              <PencilIcon class="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label="Close modal"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="space-y-6">
          <!-- Images Section -->
          <div
            v-if="frontImageUrl || backImageUrl"
            class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl"
          >
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Labels
            </h3>
            <div class="flex flex-wrap gap-6">
              <div v-if="frontImageUrl" class="relative group">
                <img
                  :src="frontImageUrl"
                  alt="Front label"
                  class="h-48 w-auto object-contain rounded-lg border border-gray-200 shadow-sm transition-transform group-hover:scale-105"
                />
                <span
                  class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded"
                  >Front Label</span
                >
              </div>
              <div v-if="backImageUrl" class="relative group">
                <img
                  :src="backImageUrl"
                  alt="Back label"
                  class="h-48 w-auto object-contain rounded-lg border border-gray-200 shadow-sm transition-transform group-hover:scale-105"
                />
                <span
                  class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded"
                  >Back Label</span
                >
              </div>
            </div>
          </div>

          <!-- Basic Info Section -->
          <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Basic Information
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >Appellation</span
                >
                <p class="text-gray-800 dark:text-gray-200">
                  {{ wine.appellation || "-" }}
                </p>
              </div>
              <div>
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >Region</span
                >
                <p class="text-gray-800 dark:text-gray-200">
                  {{ wine.region || "-" }}
                </p>
              </div>
              <div>
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >Color</span
                >
                <p class="text-gray-800 dark:text-gray-200">
                  {{ wine.color || "-" }}
                </p>
              </div>
              <div>
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >Price</span
                >
                <p class="text-gray-800 dark:text-gray-200">
                  {{ wine.price || "-" }}
                </p>
              </div>
            </div>
          </div>

          <!-- Technical Details Section -->
          <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Technical Details
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >Volume</span
                >
                <p class="text-gray-800 dark:text-gray-200">
                  {{ wine.volume || "-" }}
                </p>
              </div>
              <div>
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >Alcohol</span
                >
                <p class="text-gray-800 dark:text-gray-200">
                  {{ wine.alcohol || "-" }}
                </p>
              </div>
              <div>
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >Farming</span
                >
                <p class="text-gray-800 dark:text-gray-200">
                  {{ wine.farming || "-" }}
                </p>
              </div>
            </div>
          </div>

          <!-- Grape Varieties Section -->
          <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Grape Varieties
            </h3>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="grape in grapesList"
                :key="grape.name"
                class="px-3 py-2 bg-purple-100 text-purple-800 rounded-lg shadow-sm"
              >
                <span class="font-medium">{{ grape.name }}</span>
                <span class="text-purple-600 ml-1"
                  >{{ grape.percentage }}%</span
                >
              </div>
              <div v-if="!grapesList.length" class="text-gray-500">
                No grape varieties specified
              </div>
            </div>
          </div>

          <!-- Vinification Section -->
          <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Vinification Process
            </h3>
            <div class="space-y-3">
              <div
                v-for="step in vinificationSteps"
                :key="step.step"
                class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"
              >
                <span
                  class="font-medium text-purple-800 dark:text-purple-300"
                  >{{ step.step }}</span
                >
                <p class="text-gray-700 dark:text-gray-300 mt-1">
                  {{ step.description }}
                </p>
              </div>
              <div
                v-if="!vinificationSteps.length"
                class="text-gray-500 dark:text-gray-400"
              >
                No vinification details available
              </div>
            </div>
          </div>

          <!-- Tasting Notes Section -->
          <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Tasting Notes
            </h3>
            <div class="space-y-4">
              <div>
                <h4
                  class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
                >
                  Nose
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="note in wine.tasting_notes?.nose"
                    :key="note"
                    class="px-3 py-1 bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-300 rounded-full text-sm"
                  >
                    {{ note }}
                  </span>
                  <span
                    v-if="!wine.tasting_notes?.nose?.length"
                    class="text-gray-500 dark:text-gray-400"
                  >
                    No nose characteristics specified
                  </span>
                </div>
              </div>
              <div>
                <h4
                  class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
                >
                  Palate
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="note in wine.tasting_notes?.palate"
                    :key="note"
                    class="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 rounded-full text-sm"
                  >
                    {{ note }}
                  </span>
                  <span
                    v-if="!wine.tasting_notes?.palate?.length"
                    class="text-gray-500 dark:text-gray-400"
                  >
                    No palate characteristics specified
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Drinking Window Section -->
          <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Drinking Window
            </h3>
            <div class="flex items-center justify-center space-x-8">
              <div class="text-center">
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1"
                  >From</span
                >
                <span
                  class="text-2xl font-bold text-purple-800 dark:text-purple-300"
                  >{{ wine.drink_from || "-" }}</span
                >
              </div>
              <div class="h-px w-12 bg-gray-300 dark:bg-gray-600"></div>
              <div class="text-center">
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1"
                  >Until</span
                >
                <span
                  class="text-2xl font-bold text-purple-800 dark:text-purple-300"
                  >{{ wine.drink_until || "-" }}</span
                >
              </div>
            </div>
          </div>

          <!-- Additional Details Section -->
          <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Additional Details
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >Sulfites</span
                >
                <p class="text-gray-800 dark:text-gray-200">
                  {{ wine.sulfites || "-" }}
                </p>
              </div>
            </div>
          </div>

          <!-- Sources Section -->
          <div
            v-if="wine.sources && wine.sources.length > 0"
            class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl"
          >
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Data Sources
            </h3>
            <div class="space-y-2">
              <div
                v-for="(source, index) in wine.sources"
                :key="'source-' + index"
              >
                <a
                  :href="source"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center group"
                >
                  <span class="truncate">{{ source }}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 ml-1 text-blue-500 group-hover:text-blue-700"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
                    />
                    <path
                      d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <!-- Consumption History Section -->
          <div
            v-if="consumptionHistory.length > 0"
            class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl"
          >
            <div class="flex justify-between items-center mb-4">
              <h3
                class="font-semibold text-gray-800 dark:text-gray-200 text-lg"
              >
                Consumption History
              </h3>
              <div v-if="averageRating > 0" class="flex items-center">
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2"
                  >Average Rating:</span
                >
                <div class="flex items-center">
                  <span
                    class="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mr-1"
                    >{{ averageRating }}</span
                  >
                  <StarIcon
                    class="h-5 w-5 text-yellow-400 dark:text-yellow-300"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div
                v-for="(consumption, index) in consumptionHistory"
                :key="index"
                class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <div class="flex items-center mb-2">
                      <div class="flex">
                        <StarIcon
                          v-for="i in consumption.rating"
                          :key="i"
                          class="h-4 w-4 text-yellow-400 dark:text-yellow-300"
                        />
                        <StarIconOutline
                          v-for="i in 5 - consumption.rating"
                          :key="i + consumption.rating"
                          class="h-4 w-4 text-gray-300 dark:text-gray-600"
                        />
                      </div>
                      <span
                        class="text-xs text-gray-500 dark:text-gray-400 ml-2"
                      >
                        {{ new Date(consumption.date).toLocaleDateString() }}
                      </span>
                    </div>
                    <p
                      v-if="consumption.notes"
                      class="text-gray-700 dark:text-gray-300"
                    >
                      {{ consumption.notes }}
                    </p>
                    <p v-else class="text-gray-500 italic text-sm">
                      No notes provided
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Location Section -->
          <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
            <h3
              class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-4"
            >
              Location
            </h3>
            <div class="flex flex-col md:flex-row gap-4">
              <!-- Rack Location -->
              <div class="flex-1">
                <span
                  class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >Rack Location</span
                >
                <div class="flex items-center gap-2 mt-1">
                  <p class="text-gray-800 dark:text-gray-200">
                    {{ wine.location?.rackId || "-" }}
                  </p>
                  <button
                    @click="handleSetLocation"
                    class="p-2 bg-purple-100 text-purple-800 rounded-full shadow-sm hover:bg-purple-200 transition-all"
                    aria-label="Edit location"
                  >
                    <MapPinIcon class="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- LocationPicker Component -->
    <LocationPicker
      :show="showLocationPicker"
      :rack-id="wine.location?.rackId || defaultRackId"
      :wine-id="wine.id || ''"
      @location-saved="handleLocationSaved"
      @close="handleCloseLocationPicker"
    />
  </Teleport>
  <!-- Find Bottle AR view -->
  <FindBottleView
    v-if="showFindModal"
    :wine-id="props.wine.id || ''"
    @close="showFindModal = false"
  />
</template>

<style scoped>
.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
