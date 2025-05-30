<script setup lang="ts">
import { XMarkIcon } from "@heroicons/vue/24/outline";
import type { WineQuestionResultModalProps } from "../shared/types/ComponentProps";
import VueMarkdown from "vue-markdown-render";

const props = defineProps<WineQuestionResultModalProps>();
const emit = defineEmits<{
  (e: "close"): void;
}>();

function closeModal() {
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 dark:from-gray-900/90 dark:via-gray-900/90 dark:to-purple-900/90 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full p-8 relative"
      >
        <div class="flex justify-between items-center mb-6">
          <h2
            class="text-xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
          >
            Wine Collection Insight
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700 p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <!-- Question -->
        <div class="mb-6">
          <h3
            class="text-gray-700 dark:text-gray-200 font-semibold text-lg mb-2"
          >
            Your Question:
          </h3>
          <div class="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
            <p class="text-gray-800 dark:text-gray-200">{{ question }}</p>
          </div>
        </div>

        <!-- Response -->
        <div>
          <h3
            class="text-gray-700 dark:text-gray-200 font-semibold text-lg mb-2"
          >
            Response:
          </h3>
          <div
            class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg max-h-[50vh] overflow-y-auto"
          >
            <div class="prose prose-sm dark:prose-invert max-w-none">
              <VueMarkdown :source="response" />
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            @click="closeModal"
            class="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-700 dark:to-purple-900 dark:hover:from-purple-800 dark:hover:to-purple-950 text-white font-medium rounded-lg shadow-md transform transition-all hover:shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
.markdown-body {
  font-family: inherit;
}

/* Ensure proper spacing and styling for markdown content */
.markdown-body > * + * {
  margin-top: 1em;
}

/* Optimize for mobile */
@media (max-width: 640px) {
  .markdown-body {
    font-size: 0.9rem;
  }
}
</style>
