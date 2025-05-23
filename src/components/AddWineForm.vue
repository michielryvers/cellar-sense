<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { XMarkIcon, SignalSlashIcon } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import { addWineQuery } from "../services/dexie-db";
import { createImagePreview } from "../utils/imageHelpers";
import { isOnline$ } from "../services/network-status";
import { Subscription } from "rxjs";
import { getDistinctPurchaseLocations } from "../services/dexie-db";
import { settingsService } from "../services/settings";
import type { AddWineFormProps } from "../shared/types";

const props = defineProps<AddWineFormProps>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "wine-added"): void;
  (e: "missing-api-key"): void;
}>();

// Input elements refs
const frontLabelInput = ref<HTMLInputElement | null>(null);
const backLabelInput = ref<HTMLInputElement | null>(null);

// Form state
const frontLabelFile = ref<File | null>(null);
const backLabelFile = ref<File | null>(null);
const frontPreview = ref<string>("");
const backPreview = ref<string>("");
const purchaseLocation = ref<string>("");
const numberOfBottles = ref<number>(1);
const isLoading = ref<boolean>(false);
const error = ref<string>("");

// Network and UI state
const isOnline = ref(navigator.onLine);
const purchaseLocations = ref<string[]>([]);
const showLocationDropdown = ref<boolean>(false);

// Track subscription
let subscription: Subscription | null = null;

// Lifecycle hooks
onMounted(async () => {
  // Subscribe to online status changes
  subscription = isOnline$.subscribe((status) => {
    isOnline.value = status;
  });

  // Load purchase locations
  try {
    purchaseLocations.value = await getDistinctPurchaseLocations();
  } catch (err) {
    console.error("Error loading purchase locations:", err);
  }
});

onUnmounted(() => {
  // Clean up subscription
  if (subscription) {
    subscription.unsubscribe();
  }
});

// Computed properties
const submitButtonText = computed((): string => {
  if (isLoading.value) {
    return "Adding to Processing Queue...";
  }

  if (!isOnline.value) {
    return "Add Wine to Offline Queue";
  }

  return "Add Wine to Processing Queue";
});

// Filtered locations based on user input
const filteredLocations = computed((): string[] => {
  if (!purchaseLocation.value) return purchaseLocations.value;
  const query = purchaseLocation.value.toLowerCase();
  return purchaseLocations.value.filter((location) =>
    location.toLowerCase().includes(query)
  );
});

/**
 * Select a purchase location from dropdown
 */
function selectLocation(location: string): void {
  purchaseLocation.value = location;
  showLocationDropdown.value = false;
}

/**
 * Close the modal and reset form
 */
function closeModal(): void {
  emit("update:show", false);
  // Reset form
  frontLabelFile.value = null;
  backLabelFile.value = null;
  frontPreview.value = "";
  backPreview.value = "";
  purchaseLocation.value = "";
  numberOfBottles.value = 1;
  error.value = "";
  showLocationDropdown.value = false;
}

// Use escape key to close modal
useEscapeKey(closeModal);

/**
 * Handle outside click
 */
function handleOutsideClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    closeModal();
  }
}

/**
 * Handle purchase location field focus
 */
function handleLocationFocus(): void {
  showLocationDropdown.value = true;
}

/**
 * Handle purchase location field blur
 */
function handleLocationBlur(e: FocusEvent): void {
  // Longer delay to ensure click events on dropdown items are processed first
  setTimeout(() => {
    showLocationDropdown.value = false;
  }, 300);
}

/**
 * Handle image upload
 */
async function handleImageChange(event: Event, isBack = false): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const previewTarget = isBack ? backPreview : frontPreview;
  const fileTarget = isBack ? backLabelFile : frontLabelFile;

  // Store the original file for now
  fileTarget.value = file;

  // Show loading state while processing
  error.value = isBack
    ? "Processing back label..."
    : "Processing front label...";

  try {
    // Generate optimized preview immediately
    previewTarget.value = await createImagePreview(file);
    // Clear error message
    error.value = "";
  } catch (err) {
    error.value = "Error processing image";
    console.error("Image processing error:", err);
  }
}

/**
 * Handle form submission
 */
async function handleSubmit(): Promise<void> {
  console.time("🟣 handleSubmit — total"); // 1️⃣ start overall timer
  if (!frontLabelFile.value) {
    error.value = "Front label image is required";
    return;
  }

  // If online, check for API key. If offline, we can still queue without a key
  if (isOnline.value) {
    const apiKey = settingsService.openAiKey;
    if (!apiKey) {
      error.value = "OpenAI API key is required";
      emit("missing-api-key");
      return;
    }
  }

  error.value = "";
  isLoading.value = true;
  await nextTick(); // 2️⃣ make sure spinner is painted

  try {
    await addWineQuery({
      frontImage: frontLabelFile.value as Blob,
      backImage: backLabelFile.value as Blob | null,
      purchaseLocation: purchaseLocation.value,
      bottles: numberOfBottles.value,
      needsResize: true,
      status: "pending",
    });

    emit("wine-added");
    closeModal();
  } catch (err: any) {
    error.value = err?.message || "Failed to queue wine for processing";
    console.error("Error adding wine query:", err);
  } finally {
    isLoading.value = false;
  }
}
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
        <div class="flex justify-between items-center mb-6">
          <h2
            class="text-2xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
          >
            Add New Wine
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Close modal"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div
            v-if="error"
            class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg border border-red-200 dark:border-red-800 mb-4"
          >
            {{ error }}
          </div>

          <!-- Image Upload Section -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Front Label -->
            <div
              class="bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600 dark:hover:border-gray-500 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors"
            >
              <label
                for="frontLabelImage"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Front Label Image
                <span class="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="frontLabelImage"
                ref="frontLabelInput"
                accept="image/*"
                capture="environment"
                @change="handleImageChange($event, false)"
                class="hidden"
              />
              <div
                class="relative cursor-pointer"
                @click="frontLabelInput && frontLabelInput.click()"
              >
                <div
                  v-if="!frontPreview"
                  class="flex flex-col items-center justify-center h-40 bg-white dark:bg-gray-700 rounded-lg"
                >
                  <svg
                    class="w-12 h-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span class="mt-2 text-sm text-gray-500 dark:text-gray-400"
                    >Click to upload front label</span
                  >
                </div>
                <img
                  v-else
                  :src="frontPreview"
                  alt="Front label preview"
                  class="h-40 w-full object-contain rounded-lg"
                />
              </div>
            </div>

            <!-- Back Label -->
            <div
              class="bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600 dark:hover:border-gray-500 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors"
            >
              <label
                for="backLabelImage"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Back Label Image
                <span class="text-gray-400 dark:text-gray-500">(Optional)</span>
              </label>
              <input
                type="file"
                id="backLabelImage"
                ref="backLabelInput"
                accept="image/*"
                capture="environment"
                @change="handleImageChange($event, true)"
                class="hidden"
              />
              <div
                class="relative cursor-pointer"
                @click="backLabelInput && backLabelInput.click()"
              >
                <div
                  v-if="!backPreview"
                  class="flex flex-col items-center justify-center h-40 bg-white dark:bg-gray-700 rounded-lg"
                >
                  <svg
                    class="w-12 h-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span class="mt-2 text-sm text-gray-500 dark:text-gray-400"
                    >Click to upload back label</span
                  >
                </div>
                <img
                  v-else
                  :src="backPreview"
                  alt="Back label preview"
                  class="h-40 w-full object-contain rounded-lg"
                />
              </div>
            </div>
          </div>

          <!-- Details Section -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div class="relative">
              <label
                for="purchaseLocation"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Purchase Location
                <span class="text-gray-400 dark:text-gray-500">(Optional)</span>
              </label>
              <input
                type="text"
                id="purchaseLocation"
                v-model="purchaseLocation"
                placeholder="Where did you buy this wine?"
                @focus="handleLocationFocus"
                @blur="handleLocationBlur"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <!-- Autocomplete Dropdown -->
              <div
                v-if="showLocationDropdown && filteredLocations.length > 0"
                class="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg max-h-60 overflow-auto"
              >
                <ul class="divide-y divide-gray-200">
                  <li
                    v-for="location in filteredLocations"
                    :key="location"
                    @mousedown.prevent="selectLocation(location)"
                    class="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-purple-600 hover:text-white transition-colors"
                  >
                    {{ location }}
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label
                for="numberOfBottles"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Number of Bottles
                <span class="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="numberOfBottles"
                v-model.number="numberOfBottles"
                min="1"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <!-- Network Status -->
          <div
            v-if="!isOnline"
            class="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-lg"
          >
            <div class="flex items-center">
              <SignalSlashIcon class="h-5 w-5 mr-2" />
              <span class="text-sm">
                You are currently offline. Changes will be saved locally and
                synced when you are back online.
              </span>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full mt-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-700 dark:to-purple-900 dark:hover:from-purple-800 dark:hover:to-purple-950 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          >
            <svg
              v-if="isLoading"
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
            {{ submitButtonText }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>
