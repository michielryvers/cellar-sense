<script setup lang="ts">
import { ref, watch } from "vue";
import type {
  RecommendationOption,
  RecommendationsResultModalProps,
} from "../shared/types";
import { getWine } from "../services/dexie-db";
import type { Wine } from "../shared/Wine";

const props = defineProps<RecommendationsResultModalProps>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "show-detail", id: string): void;
}>();

const wineImages = ref<Record<string, string | undefined>>({});

async function fetchWineImage(wineId: string) {
  if (!wineId || wineImages.value[wineId]) return;
  try {
    const wine = await getWine(wineId);
    if (wine && wine.images && wine.images.front) {
      // Assuming wine.images.front is either a URL string or a Blob
      if (typeof wine.images.front === "string") {
        wineImages.value[wineId] = wine.images.front;
      } else if (wine.images.front instanceof Blob) {
        wineImages.value[wineId] = URL.createObjectURL(wine.images.front);
      }
    }
  } catch (error) {
    console.error(`Failed to fetch image for wine ${wineId}:`, error);
  }
}

// Watch for changes in results and fetch images
watch(
  () => props.results, // Correctly access props here
  (newResults) => {
    if (newResults) {
      newResults.forEach((rec: RecommendationOption) => {
        // Add type for rec
        fetchWineImage(rec.id);
      });
    }
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 backdrop-blur-sm dark:from-purple-900/80 dark:via-neutral-900/80 dark:to-pink-900/80"
  >
    <div
      class="relative bg-white/90 rounded-2xl shadow-2xl max-w-3xl w-full p-8 overflow-hidden border border-purple-100 dark:bg-neutral-800/90 dark:border-purple-800"
    >
      <div
        class="flex items-center justify-between px-6 pt-6 pb-2 border-b border-purple-50 bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:border-purple-700/50 dark:from-purple-800/30 dark:to-pink-800/30"
      >
        <h3
          class="text-xl font-extrabold text-purple-700 tracking-tight dark:text-purple-300"
        >
          🍷 Recommended Wines
        </h3>
        <button
          class="rounded-full p-2 hover:bg-purple-100 transition-colors text-gray-400 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:hover:bg-purple-700/50 dark:text-gray-500 dark:hover:text-purple-400 dark:focus:ring-purple-600"
          @click="$emit('close')"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div
        v-if="query"
        class="px-6 pt-3 pb-1 text-sm text-purple-900/80 italic dark:text-purple-300/80"
      >
        <span class="font-semibold text-purple-700 dark:text-purple-400"
          >Your query:
        </span>
        <span> {{ query }} </span>
      </div>
      <ul
        class="divide-y divide-purple-50 px-6 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200/60 scrollbar-track-transparent dark:divide-purple-700/50 dark:scrollbar-thumb-purple-600/60"
      >
        <li
          v-for="rec in results"
          :key="rec.id"
          class="py-3 flex gap-4 items-start hover:bg-purple-50/40 rounded-lg transition-colors px-2 dark:hover:bg-neutral-700/40"
        >
          <div v-if="wineImages[rec.id]" class="w-16 h-24 flex-shrink-0">
            <img
              :src="wineImages[rec.id]"
              alt="Wine label"
              class="w-full h-full object-contain rounded"
            />
          </div>
          <div class="flex-grow">
            <div class="flex items-center gap-2">
              <span
                class="block w-2 h-2 rounded-full bg-purple-300 dark:bg-purple-600"
              ></span>
              <button
                type="button"
                class="font-semibold text-purple-700 text-base underline underline-offset-2 hover:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-colors dark:text-purple-400 dark:hover:text-purple-200 dark:focus:ring-purple-500 text-left"
                @click="$emit('show-detail', rec.id)"
              >
                {{ rec.name }}
              </button>
              <span
                class="text-xs text-purple-500 font-medium ml-1 dark:text-purple-400/80"
                >({{ rec.vintage }})</span
              >
            </div>
            <div class="text-sm text-gray-700 font-medium dark:text-gray-300">
              {{ rec.vintner }}
            </div>
            <div
              class="text-xs text-gray-500 mt-1 italic dark:text-gray-400/80"
            >
              {{ rec.reason }}
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
