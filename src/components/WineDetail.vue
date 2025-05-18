<script setup lang="ts">
import { computed } from "vue";
import { XMarkIcon, PencilIcon } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import { Wine } from "../shared/Wine";

const props = defineProps<{ show: boolean; wine: Wine }>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "edit", wine: Wine): void;
}>();

// Grapes: now an object of { [name]: percentage }
const grapesList = computed(() => {
  if (!props.wine.grapes) return [];
  return props.wine.grapes;
});

const vinificationSteps = computed(() => {
  if (!props.wine.vinification) return [];
  return props.wine.vinification;
});

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

function handleEdit(): void {
  emit("edit", props.wine);
  emit("update:show", false);
}

function closeModal(): void {
  emit("update:show", false);
}

// Use escape key to close modal
useEscapeKey(closeModal);

function handleOutsideClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    closeModal();
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
        <div
          class="flex justify-between items-center mb-6 border-b border-gray-100 pb-4"
        >
          <div>
            <h2
              class="text-2xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
            >
              {{ wine.name || "Unnamed Wine" }}
            </h2>
            <p class="text-gray-600 mt-1">
              {{ wine.vintner || "" }}
              {{ wine.vintage ? `(${wine.vintage})` : "" }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              @click="handleEdit"
              class="inline-flex items-center px-4 py-2 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-md transition-all transform hover:scale-105"
            >
              <PencilIcon class="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
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
            class="bg-gray-50 p-6 rounded-xl"
          >
            <h3 class="font-semibold text-gray-800 text-lg mb-4">Labels</h3>
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
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">
              Basic Information
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span class="text-sm font-medium text-gray-600"
                  >Appellation</span
                >
                <p class="text-gray-800">{{ wine.appellation || "-" }}</p>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-600">Region</span>
                <p class="text-gray-800">{{ wine.region || "-" }}</p>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-600">Color</span>
                <p class="text-gray-800">{{ wine.color || "-" }}</p>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-600">Price</span>
                <p class="text-gray-800">{{ wine.price || "-" }}</p>
              </div>
            </div>
          </div>

          <!-- Technical Details Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">
              Technical Details
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span class="text-sm font-medium text-gray-600">Volume</span>
                <p class="text-gray-800">{{ wine.volume || "-" }}</p>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-600">Alcohol</span>
                <p class="text-gray-800">{{ wine.alcohol || "-" }}</p>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-600">Farming</span>
                <p class="text-gray-800">{{ wine.farming || "-" }}</p>
              </div>
            </div>
          </div>

          <!-- Grape Varieties Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">
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
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">
              Vinification Process
            </h3>
            <div class="space-y-3">
              <div
                v-for="step in vinificationSteps"
                :key="step.step"
                class="bg-white p-4 rounded-lg shadow-sm"
              >
                <span class="font-medium text-purple-800">{{ step.step }}</span>
                <p class="text-gray-700 mt-1">{{ step.description }}</p>
              </div>
              <div v-if="!vinificationSteps.length" class="text-gray-500">
                No vinification details available
              </div>
            </div>
          </div>

          <!-- Tasting Notes Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">
              Tasting Notes
            </h3>
            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium text-gray-600 mb-2">Nose</h4>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="note in wine.tasting_notes?.nose"
                    :key="note"
                    class="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm"
                  >
                    {{ note }}
                  </span>
                  <span
                    v-if="!wine.tasting_notes?.nose?.length"
                    class="text-gray-500"
                  >
                    No nose characteristics specified
                  </span>
                </div>
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-600 mb-2">Palate</h4>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="note in wine.tasting_notes?.palate"
                    :key="note"
                    class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                  >
                    {{ note }}
                  </span>
                  <span
                    v-if="!wine.tasting_notes?.palate?.length"
                    class="text-gray-500"
                  >
                    No palate characteristics specified
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Drinking Window Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">
              Drinking Window
            </h3>
            <div class="flex items-center justify-center space-x-8">
              <div class="text-center">
                <span class="text-sm font-medium text-gray-600 block mb-1"
                  >From</span
                >
                <span class="text-2xl font-bold text-purple-800">{{
                  wine.drink_from || "-"
                }}</span>
              </div>
              <div class="h-px w-12 bg-gray-300"></div>
              <div class="text-center">
                <span class="text-sm font-medium text-gray-600 block mb-1"
                  >Until</span
                >
                <span class="text-2xl font-bold text-purple-800">{{
                  wine.drink_until || "-"
                }}</span>
              </div>
            </div>
          </div>

          <!-- Additional Details Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">
              Additional Details
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span class="text-sm font-medium text-gray-600">Sulfites</span>
                <p class="text-gray-800">{{ wine.sulfites || "-" }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
