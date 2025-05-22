<script setup lang="ts">
import { ref } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { StarIcon } from "@heroicons/vue/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import type { Wine, WineConsumption } from "../shared/Wine";

interface DrinkWineModalProps {
  show: boolean;
  wine: Wine;
}

const props = defineProps<DrinkWineModalProps>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "save", consumption: WineConsumption): void;
  (e: "cancel"): void;
}>();

// Form data
const rating = ref<number>(0);
const notes = ref<string>("");

// Handle hovering over stars for selection preview
const hoverRating = ref<number>(0);

// Reset form on mount or when props change
function resetForm(): void {
  rating.value = 0;
  notes.value = "";
  hoverRating.value = 0;
}

// Close the modal
function closeModal(): void {
  resetForm();
  emit("update:show", false);
  emit("cancel");
}

// Handle clicking outside the modal
function handleOutsideClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    closeModal();
  }
}

// Handle star click
function handleStarClick(value: number): void {
  rating.value = value;
}

// Handle star hover
function handleStarHover(value: number): void {
  hoverRating.value = value;
}

// Handle star hover leave
function handleStarLeave(): void {
  hoverRating.value = 0;
}

// Submit the form
function handleSubmit(): void {
  const consumption: WineConsumption = {
    date: new Date().toISOString(),
    rating: rating.value,
    notes: notes.value,
  };
  
  emit("save", consumption);
  resetForm();
  emit("update:show", false);
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
        class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative"
      >
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h2
            class="text-xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
          >
            Rate This Wine
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Close modal"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <!-- Wine info -->
        <div class="mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
          <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200">
            {{ wine.name }}
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            {{ wine.vintner }} {{ wine.vintage ? `(${wine.vintage})` : "" }}
          </p>
        </div>

        <!-- Content -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Rating Section -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How would you rate this wine?
            </label>
            <div 
              class="flex items-center justify-center gap-2 p-4"
              @mouseleave="handleStarLeave"
            >
              <button 
                v-for="i in 5" 
                :key="i"
                type="button"
                @click="handleStarClick(i)"
                @mouseenter="handleStarHover(i)"
                class="focus:outline-none transition-transform hover:scale-110"
              >
                <StarIcon 
                  v-if="(hoverRating || rating) >= i"
                  class="h-8 w-8 text-yellow-400" 
                />
                <StarIconOutline 
                  v-else
                  class="h-8 w-8 text-gray-300" 
                />
              </button>
            </div>
          </div>

          <!-- Notes Section -->
          <div>
            <label 
              for="notes" 
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Your Tasting Notes
            </label>
            <textarea
              id="notes"
              v-model="notes"
              rows="4"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Share your thoughts about this wine..."
            ></textarea>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 transition-colors shadow-sm"
              :disabled="rating === 0"
            >
              Save Rating
            </button>
          </div>
        </form>
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