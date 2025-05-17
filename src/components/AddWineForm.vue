<script setup lang="ts">
import { ref, Ref } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import { extractWineData } from "../services/openai";
import { addWine } from "../services/db";
import {
  resizeImageToBase64,
  resizeImageToBlob,
  createImagePreview,
} from "../utils/imageHelpers";

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "wine-added"): void;
  (e: "missing-api-key"): void;
}>();

const frontLabelInput = ref<HTMLInputElement | null>(null);
const backLabelInput = ref<HTMLInputElement | null>(null);
const frontLabelFile = ref<File | null>(null);
const backLabelFile = ref<File | null>(null);
const frontPreview = ref<string>("");
const backPreview = ref<string>("");
const purchaseLocation = ref<string>("");
const numberOfBottles = ref<number>(1);
const isLoading = ref<boolean>(false);
const error = ref<string>("");

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
}

// Use escape key to close modal
useEscapeKey(closeModal);

function handleOutsideClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    closeModal();
  }
}

async function handleImageChange(event: Event, isBack = false): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const previewTarget = isBack ? backPreview : frontPreview;
  const fileTarget = isBack ? backLabelFile : frontLabelFile;

  fileTarget.value = file;
  try {
    previewTarget.value = await createImagePreview(file);
  } catch (err) {
    error.value = "Error processing image";
    console.error("Image processing error:", err);
  }
}

async function handleSubmit(): Promise<void> {
  if (!frontLabelFile.value) {
    error.value = "Front label image is required";
    return;
  }

  const apiKeyRaw = localStorage.getItem("openai_api_key");
  const apiKey: string = apiKeyRaw || "";
  if (!apiKey) {
    error.value = "OpenAI API key is required";
    emit("missing-api-key");
    return;
  }

  error.value = "";
  isLoading.value = true;

  try {
    const frontFile: File = frontLabelFile.value!;
    const backFile: File | null = backLabelFile.value;
    const frontBase64Result = await resizeImageToBase64(frontFile);
    const backBase64 = backFile ? await resizeImageToBase64(backFile) : "";
    const frontBlob = await resizeImageToBlob(frontFile);
    const backBlob = backFile ? await resizeImageToBlob(backFile) : null;

    if (frontBase64Result === null) {
      throw new Error("Failed to process front label image");
    }

    const wineData = await extractWineData({
      apiKey,
      purchaseLocation: purchaseLocation.value,
      frontBase64: frontBase64Result,
      backBase64,
    });

    // Add inventory information
    (wineData as any).inventory = {
      bottles: numberOfBottles.value,
      purchaseDate: new Date().toISOString(),
      purchaseLocation: purchaseLocation.value,
    };

    // Attach resized images as blobs for local storage
    (wineData as any).images = {
      front: frontBlob ?? null,
      back: backBlob ?? null,
    };

    await addWine(wineData);
    emit("wine-added");
    closeModal();
  } catch (err: any) {
    error.value = err?.message || "Failed to process wine information";
    console.error("Error adding wine:", err);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-400 bg-opacity-40"
      @click="handleOutsideClick"
    >
      <div
        class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative"
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
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div
            v-if="error"
            class="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-4"
          >
            {{ error }}
          </div>

          <!-- Image Upload Section -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Front Label -->
            <div
              class="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors"
            >
              <label
                for="frontLabelImage"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Front Label Image
                <span class="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="frontLabelImage"
                ref="frontLabelInput"
                accept="image/*"
                @change="handleImageChange($event, false)"
                class="hidden"
              />
              <div
                class="relative cursor-pointer"
                @click="frontLabelInput && frontLabelInput.click()"
              >
                <div
                  v-if="!frontPreview"
                  class="flex flex-col items-center justify-center h-40 bg-white rounded-lg"
                >
                  <svg
                    class="w-12 h-12 text-gray-400"
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
                  <span class="mt-2 text-sm text-gray-500"
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
              class="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors"
            >
              <label
                for="backLabelImage"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Back Label Image
                <span class="text-gray-400">(Optional)</span>
              </label>
              <input
                type="file"
                id="backLabelImage"
                ref="backLabelInput"
                accept="image/*"
                @change="handleImageChange($event, true)"
                class="hidden"
              />
              <div
                class="relative cursor-pointer"
                @click="backLabelInput && backLabelInput.click()"
              >
                <div
                  v-if="!backPreview"
                  class="flex flex-col items-center justify-center h-40 bg-white rounded-lg"
                >
                  <svg
                    class="w-12 h-12 text-gray-400"
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
                  <span class="mt-2 text-sm text-gray-500"
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
            <div>
              <label
                for="purchaseLocation"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Purchase Location
                <span class="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                id="purchaseLocation"
                v-model="purchaseLocation"
                placeholder="Where did you buy this wine?"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label
                for="numberOfBottles"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Number of Bottles
                <span class="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="numberOfBottles"
                v-model="numberOfBottles"
                min="1"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full mt-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
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
            {{
              isLoading
                ? "Processing with AI..."
                : "Process Wine Information (via OpenAI)"
            }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>
