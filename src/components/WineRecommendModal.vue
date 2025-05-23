<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  StarIcon,
  XMarkIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/vue/24/outline";
import { liveQuery } from "dexie";
import type {
  RecommendationHistoryEntry,
  WineRecommendModalProps,
} from "../shared/types";
import { getAllRecommendations } from "../services/dexie-db";

const props = defineProps<WineRecommendModalProps>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "submit-query", query: string): void;
  (e: "show-past-result", rec: RecommendationHistoryEntry): void;
}>();

const userQuery = ref("");

// Past recommendations state
const showPast = ref(false);
const pastRecs = ref<RecommendationHistoryEntry[]>([]);
let subscription: any = null;

function togglePast() {
  showPast.value = !showPast.value;
}

onMounted(() => {
  subscription = liveQuery(() => getAllRecommendations()).subscribe({
    next: (recs) => {
      pastRecs.value = recs;
    },
    error: (err) => {
      console.error("Failed to load past recommendations", err);
    },
  });
});

onUnmounted(() => {
  if (subscription) subscription.unsubscribe();
});

function closeModal() {
  emit("update:show", false);
  userQuery.value = "";
}

function handleSubmit() {
  if (userQuery.value.trim()) {
    emit("submit-query", userQuery.value.trim());
  }
}

function handleShowPast(rec: RecommendationHistoryEntry) {
  emit("show-past-result", rec);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 backdrop-blur-sm dark:from-purple-900/80 dark:via-neutral-900/80 dark:to-pink-900/80"
      @click.self="closeModal"
    >
      <div
        class="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 relative dark:bg-neutral-800"
      >
        <div class="flex justify-between items-center mb-4">
          <h2
            class="text-xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent dark:from-purple-500 dark:to-purple-300"
          >
            Ask for a Wine Recommendation
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close modal"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>
        <!-- Past Recommendations Toggle -->
        <div class="mb-4">
          <button
            type="button"
            class="flex items-center gap-2 text-purple-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 hover:underline dark:text-purple-400 dark:focus:ring-purple-600"
            @click="togglePast"
          >
            <ClockIcon class="h-5 w-5" />
            Past recommendations
            <ChevronUpIcon v-if="showPast" class="h-4 w-4" />
            <ChevronDownIcon v-else class="h-4 w-4" />
          </button>
        </div>
        <div v-if="showPast" class="mb-6">
          <div
            v-if="pastRecs.length === 0"
            class="text-gray-400 text-sm italic px-2 py-4 dark:text-gray-500"
          >
            No previous recommendations yet.
          </div>
          <ul
            v-else
            class="divide-y divide-purple-50 rounded-lg bg-purple-50/30 dark:divide-purple-900/50 dark:bg-neutral-700/30"
          >
            <li
              v-for="rec in pastRecs"
              :key="rec.id"
              class="px-3 py-3 hover:bg-purple-100/60 cursor-pointer transition-colors dark:hover:bg-neutral-600/60"
              @click="handleShowPast(rec)"
            >
              <div class="flex items-center gap-2">
                <span
                  class="block w-2 h-2 rounded-full bg-purple-300 dark:bg-purple-600"
                ></span>
                <span
                  class="font-medium text-purple-800 text-sm line-clamp-1 dark:text-purple-300"
                  >{{ rec.query }}</span
                >
                <span
                  class="ml-auto text-xs text-gray-400 dark:text-gray-500"
                  >{{ new Date(rec.createdAt).toLocaleString() }}</span
                >
              </div>
              <div
                class="text-xs text-gray-500 mt-1 line-clamp-2 dark:text-gray-400"
              >
                {{ rec.results.map((r) => r.name).join(", ") }}
              </div>
            </li>
          </ul>
        </div>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <label
            class="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300"
          >
            Describe your meal, occasion, mood, or anything else:
          </label>
          <textarea
            v-model="userQuery"
            rows="4"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:bg-neutral-700 dark:border-neutral-600 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:ring-purple-600 dark:focus:border-transparent"
            placeholder="e.g. Steak dinner with friends, birthday, feeling adventurous..."
            :disabled="loading"
            required
          />
          <div v-if="error" class="text-red-600 text-sm dark:text-red-400">
            {{ error }}
          </div>
          <button
            type="submit"
            :disabled="loading || !userQuery.trim()"
            class="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center dark:from-purple-700 dark:to-purple-800 dark:hover:from-purple-800 dark:hover:to-purple-900 dark:disabled:opacity-60"
          >
            <span v-if="loading" class="flex items-center dark:text-white">
              <svg
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
              Waiting for OpenAI…
            </span>
            <span v-else class="flex items-center dark:text-white">
              <StarIcon class="h-5 w-5 mr-2" />
              <span>Get Recommendations</span>
            </span>
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>
