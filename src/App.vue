<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type { Wine } from "./shared/Wine";
import WineTable from "./components/WineTable.vue";
import SettingsModal from "./components/SettingsModal.vue";
import AddWineForm from "./components/AddWineForm.vue";
import EditWineForm from "./components/EditWineForm.vue";
import WineQueue from "./components/WineQueue.vue";
import WineRecommendModal from "./components/WineRecommendModal.vue";
import RecommendationsResultModal from "./components/RecommendationsResultModal.vue";
import WineQuestionModal from "./components/WineQuestionModal.vue";
import WineQuestionResultModal from "./components/WineQuestionResultModal.vue";
import type {
  RecommendationHistoryEntry,
  RecommendationOption,
  WineQuestionEntry,
} from "./shared/types";
import WineDetail from "./components/WineDetail.vue";
import {
  Cog6ToothIcon,
  PlusIcon,
  StarIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/vue/24/outline";
import { getAllWines } from "./services/dexie-db";
import { getWineRecommendations } from "./services/openai-recommend";
import { askWineQuestion } from "./services/openai-questions";
import { settingsService } from "./services/settings";

// Modal visibility state
const showSettings = ref(false);
const showAddModal = ref(false);
const showRecommendModal = ref(false);
const showDetailModal = ref(false);
const showEditModal = ref(false);
const showRecommendationsResultModal = ref(false);
const showQuestionModal = ref(false);
const showQuestionResultModal = ref(false);

// Recommendation state
const recommendLoading = ref(false);
const recommendError = ref("");
const recommendResults = ref<RecommendationOption[] | null>(null);
const recommendQuery = ref<string>("");

// Question state
const questionLoading = ref(false);
const questionError = ref("");
const questionResponse = ref<string>("");
const questionText = ref<string>("");

// Wine selection state
const selectedWine = ref<Wine | null>(null);

/**
 * Show settings modal
 */
function handleShowSettings(): void {
  showSettings.value = true;
}

/**
 * Handle settings save
 */
function handleSettingsSave(): void {
  showSettings.value = false;
}

// Theme management
let themeCleanup: (() => void) | null = null;

onMounted(() => {
  // Apply theme on initial load
  settingsService.applyTheme();

  // Set up listener for system theme changes
  themeCleanup = settingsService.setupThemeListener();
});

onUnmounted(() => {
  // Clean up theme listener when component is unmounted
  if (themeCleanup) {
    themeCleanup();
  }
});

/**
 * Handle add new wine button click
 */
function handleAddNew(): void {
  if (!settingsService.hasOpenAiKey()) {
    showSettings.value = true;
  } else {
    showAddModal.value = true;
  }
}

/**
 * Show wine recommendation modal
 */
function handleShowRecommend(): void {
  recommendResults.value = null;
  recommendQuery.value = "";
  recommendError.value = "";
  showRecommendModal.value = true;
}

/**
 * Handle recommendation query submission
 */
async function handleSubmitRecommendQuery(query: string): Promise<void> {
  recommendLoading.value = true;
  recommendError.value = "";
  recommendResults.value = null;
  recommendQuery.value = query;
  try {
    const apiKey = settingsService.openAiKey;
    if (!apiKey) throw new Error("OpenAI API key is required");
    const wines = await getAllWines();
    const inStock = wines.filter(
      (w) => w.inventory?.bottles && w.inventory.bottles > 0
    );
    if (!inStock.length) throw new Error("No wines in stock");
    const recs = await getWineRecommendations({
      apiKey,
      wines: inStock,
      userQuery: query,
    });
    recommendResults.value = recs;
    showRecommendModal.value = false;
    showRecommendationsResultModal.value = true;
  } catch (err: any) {
    recommendError.value = err?.message || "Failed to get recommendations";
  } finally {
    recommendLoading.value = false;
  }
}

/**
 * Show a past recommendation
 */
function handleShowPastRecommendation(rec: RecommendationHistoryEntry): void {
  recommendResults.value = rec.results;
  recommendQuery.value = rec.query;
  showRecommendModal.value = false;
  showRecommendationsResultModal.value = true;
}

/**
 * Show wine detail from recommendation
 */
async function handleShowRecommendationDetail(wineId: string): Promise<void> {
  // Find the wine in the user's cellar by id
  const wines = await getAllWines();
  const wine = wines.find((w) => w.id === wineId);
  if (wine) {
    selectedWine.value = wine;
    showDetailModal.value = true;
    showRecommendationsResultModal.value = false;
  }
}

/**
 * Handle edit wine action
 */
function handleEditWine(wine: Wine): void {
  selectedWine.value = wine;
  showEditModal.value = true;
}

/**
 * Show wine question modal
 */
function handleShowQuestion(): void {
  questionResponse.value = "";
  questionText.value = "";
  questionError.value = "";
  showQuestionModal.value = true;
}

/**
 * Handle question submission
 */
async function handleSubmitQuestion(question: string): Promise<void> {
  questionLoading.value = true;
  questionError.value = "";
  questionResponse.value = "";
  questionText.value = question;
  try {
    const apiKey = settingsService.openAiKey;
    if (!apiKey) throw new Error("OpenAI API key is required");
    const wines = await getAllWines();
    if (!wines.length) throw new Error("No wines in collection");
    const response = await askWineQuestion({
      apiKey,
      wines,
      userQuestion: question,
    });
    questionResponse.value = response;
    showQuestionModal.value = false;
    showQuestionResultModal.value = true;
  } catch (err: any) {
    questionError.value = err?.message || "Failed to get a response";
  } finally {
    questionLoading.value = false;
  }
}

/**
 * Show a past question and response
 */
function handleShowPastQuestion(entry: WineQuestionEntry): void {
  questionResponse.value = entry.response;
  questionText.value = entry.question;
  showQuestionModal.value = false;
  showQuestionResultModal.value = true;
}
</script>

<template>
  <div
    class="container mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen transition-colors duration-300"
  >
    <!-- Header Section -->
    <div
      class="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 space-y-3 md:space-y-0"
    >
      <div class="flex items-center">
        <img
          src="./assets/cellar-sense.svg"
          alt="CellarSense Logo"
          class="h-8 md:h-10 mr-3 dark:invert dark:brightness-200 transition-all duration-300"
        />
        <div>
          <h1
            class="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
          >
            CellarSense
          </h1>
          <p class="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
            Snap a label, let OpenAI parse it — CellarSense catalogues your
            cellar in seconds.
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 md:gap-3">
        <button
          @click="showSettings = true"
          class="inline-flex items-center px-2 py-1 md:px-4 md:py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg md:rounded-xl shadow-sm transition-all hover:shadow-md"
          title="Settings"
        >
          <Cog6ToothIcon class="h-5 w-5 md:mr-2" />
          <span class="hidden md:inline">Settings</span>
        </button>
        <button
          @click="handleShowRecommend"
          class="inline-flex items-center px-2 py-1 md:px-4 md:py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg md:rounded-xl shadow-sm transition-all hover:shadow-md"
          title="AI Wine Recommendation"
        >
          <StarIcon class="h-5 w-5 md:mr-2" />
          <span class="hidden md:inline">Recommend</span>
        </button>
        <button
          @click="handleShowQuestion"
          class="inline-flex items-center px-2 py-1 md:px-4 md:py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg md:rounded-xl shadow-sm transition-all hover:shadow-md"
          title="Ask AI About Your Wines"
        >
          <QuestionMarkCircleIcon class="h-5 w-5 md:mr-2" />
          <span class="hidden md:inline">Ask AI</span>
        </button>
        <button
          @click="handleAddNew"
          class="inline-flex items-center px-3 py-1 md:px-6 md:py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg md:rounded-xl shadow-md transform transition-all hover:shadow-lg hover:scale-105 dark:from-purple-700 dark:to-purple-900 dark:hover:from-purple-800 dark:hover:to-purple-950"
        >
          <PlusIcon class="h-5 w-5 md:mr-2" />
          <span class="md:inline">Add Wine</span>
        </button>
      </div>
    </div>

    <WineTable />

    <!-- AI Queue -->
    <WineQueue />

    <AddWineForm
      v-model:show="showAddModal"
      @wine-added="showAddModal = false"
      @missing-api-key="showSettings = true"
    />
    <WineRecommendModal
      v-model:show="showRecommendModal"
      :loading="recommendLoading"
      :error="recommendError"
      @submit-query="handleSubmitRecommendQuery"
      @show-past-result="handleShowPastRecommendation"
    />
    <RecommendationsResultModal
      :show="showRecommendationsResultModal"
      :results="recommendResults || []"
      :query="recommendQuery"
      @close="showRecommendationsResultModal = false"
      @show-detail="handleShowRecommendationDetail"
    />
    <WineDetail
      v-if="selectedWine"
      v-model:show="showDetailModal"
      :wine="selectedWine"
      @edit="handleEditWine"
    />
    <EditWineForm
      v-if="selectedWine"
      :key="selectedWine.id"
      v-model:show="showEditModal"
      :wine="selectedWine"
      @wine-updated="showEditModal = false"
    />
    <SettingsModal v-model:show="showSettings" @save="handleSettingsSave" />
    <WineQuestionModal
      v-model:show="showQuestionModal"
      :loading="questionLoading"
      :error="questionError"
      @submit-question="handleSubmitQuestion"
      @show-past-question="handleShowPastQuestion"
    />
    <WineQuestionResultModal
      :show="showQuestionResultModal"
      :response="questionResponse"
      :question="questionText"
      @close="showQuestionResultModal = false"
    />
  </div>
</template>

<style>
@import "./style.css";

#app {
  max-width: 1280px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
