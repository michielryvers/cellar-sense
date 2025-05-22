<script setup lang="ts">
import { ref, watchEffect, onUnmounted } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import type { LoginDexieModalProps } from "../shared/types";

// Props and emits
const props = defineProps<LoginDexieModalProps>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm", value: string): void;
  (e: "cancel"): void;
}>();

// Local state
const inputValue = ref(props.inputValue || "");
const isLoading = ref(false);

// Reset input when inputValue prop changes
watchEffect(() => {
  if (props.inputValue !== undefined) {
    inputValue.value = props.inputValue;
  }
});

/**
 * Close the modal
 */
function closeModal(): void {
  emit("update:show", false);
}

/**
 * Handle clicking outside the modal
 */
function handleOutsideClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    closeModal();
  }
}

/**
 * Handle form submission
 */
function handleSubmit(): void {
  if (inputValue.value.trim() || !props.inputPlaceholder) {
    if (props.onConfirm) {
      isLoading.value = true;
      props.onConfirm();
      isLoading.value = false;
    } else {
      emit("confirm", inputValue.value.trim());
    }
    // Only close the modal if no inputPlaceholder (means it's a confirmation dialog)
    if (!props.inputPlaceholder) {
      closeModal();
    }
  }
}

/**
 * Handle cancel button click
 */
function handleCancel(): void {
  if (props.onCancel) {
    props.onCancel();
  } else {
    emit("cancel");
  }
  closeModal();
}

// Add escape key handling
useEscapeKey(closeModal);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 backdrop-blur-sm"
      @click="handleOutsideClick"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-0 w-full max-w-md relative border border-gray-200 dark:border-gray-700"
      >
        <div
          class="flex items-center justify-between px-6 pt-5 pb-2 border-b border-gray-100 dark:border-gray-700"
        >
          <h2 class="text-lg font-semibold text-purple-900 dark:text-purple-200 tracking-tight">
            {{ title || "Dexie Cloud Authentication" }}
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6">
          <!-- Message -->
          <p v-if="message" class="text-gray-600 dark:text-gray-300 mb-4">{{ message }}</p>

          <!-- Error message -->
          <div v-if="error" class="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
            {{ error }}
          </div>

          <!-- Input field -->
          <div v-if="inputPlaceholder" class="mb-4">
            <input
              v-model="inputValue"
              :placeholder="inputPlaceholder"
              type="email"
              autocomplete="email"
              required
              class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <!-- Buttons -->
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-700 dark:to-purple-900 dark:hover:from-purple-800 dark:hover:to-purple-950 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              <span v-if="isLoading" class="flex items-center">
                <svg
                  class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Loading...
              </span>
              <span v-else>
                {{ confirmButtonText || "Continue" }}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>