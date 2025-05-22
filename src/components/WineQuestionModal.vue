<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/vue/24/outline";
import { liveQuery } from "dexie";
import { getAllWineQuestions } from "../services/dexie-db";
import type {
  WineQuestionEntry,
  WineQuestionModalProps,
} from "../shared/types";

const props = defineProps<WineQuestionModalProps>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "submit-question", question: string): void;
  (e: "show-past-question", entry: WineQuestionEntry): void;
}>();

const userQuestion = ref("");

// Past questions state
const showPast = ref(false);
const pastQuestions = ref<WineQuestionEntry[]>([]);
let subscription: any = null;

function togglePast() {
  showPast.value = !showPast.value;
}

onMounted(() => {
  subscription = liveQuery(() => getAllWineQuestions()).subscribe({
    next: (questions) => {
      pastQuestions.value = questions;
    },
    error: (err) => {
      console.error("Failed to load past questions", err);
    },
  });
});

onUnmounted(() => {
  if (subscription) subscription.unsubscribe();
});

function closeModal() {
  emit("update:show", false);
  userQuestion.value = "";
}

function handleSubmit() {
  if (userQuestion.value.trim()) {
    emit("submit-question", userQuestion.value.trim());
  }
}

function handleShowPast(entry: WineQuestionEntry) {
  emit("show-past-question", entry);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 dark:from-gray-900/90 dark:via-gray-900/90 dark:to-purple-900/90 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-8 relative">
        <div class="flex justify-between items-center mb-4">
          <h2
            class="text-xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
          >
            Ask About Your Wine Collection
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>
        <!-- Past Questions Toggle -->
        <div class="mb-4">
          <button
            type="button"
            class="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 hover:underline"
            @click="togglePast"
          >
            <ClockIcon class="h-5 w-5" />
            Past questions
            <ChevronUpIcon v-if="showPast" class="h-4 w-4" />
            <ChevronDownIcon v-else class="h-4 w-4" />
          </button>
        </div>
        <div v-if="showPast" class="mb-6">
          <div
            v-if="pastQuestions.length === 0"
            class="text-gray-400 dark:text-gray-500 text-sm italic px-2 py-4"
          >
            No previous questions yet.
          </div>
          <ul
            v-else
            class="divide-y divide-purple-50 dark:divide-purple-900 rounded-lg bg-purple-50/30 dark:bg-purple-900/30"
          >
            <li
              v-for="entry in pastQuestions"
              :key="entry.id"
              class="px-3 py-3 hover:bg-purple-100/60 dark:hover:bg-purple-800/30 cursor-pointer transition-colors"
              @click="handleShowPast(entry)"
            >
              <div class="flex items-center gap-2">
                <span class="block w-2 h-2 rounded-full bg-purple-300 dark:bg-purple-500"></span>
                <span
                  class="font-medium text-purple-800 dark:text-purple-300 text-sm line-clamp-1"
                  >{{ entry.question }}</span
                >
                <span class="ml-auto text-xs text-gray-400 dark:text-gray-500">{{
                  new Date(entry.createdAt).toLocaleString()
                }}</span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {{
                  entry.response.substring(0, 100) +
                  (entry.response.length > 100 ? "..." : "")
                }}
              </div>
            </li>
          </ul>
        </div>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Ask a question about your wine collection:
          </label>
          <textarea
            v-model="userQuestion"
            rows="4"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="e.g. Which wine should I serve with seafood? Do I have any wines from Burgundy?"
            :disabled="loading"
            required
          />
          <div v-if="error" class="text-red-600 dark:text-red-400 text-sm">{{ error }}</div>
          <button
            type="submit"
            :disabled="loading || !userQuestion.trim()"
            class="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-700 dark:to-purple-900 dark:hover:from-purple-800 dark:hover:to-purple-950 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          >
            <span v-if="loading" class="flex items-center">
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
              Asking OpenAI…
            </span>
            <span v-else class="flex items-center">
              <QuestionMarkCircleIcon class="h-5 w-5 mr-2" />
              <span>Ask Question</span>
            </span>
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>
