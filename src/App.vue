<script setup lang="ts">
import { ref } from "vue";
import type { Wine } from "./shared/Wine";
import WineTable from "./components/WineTable.vue";
import SettingsModal from "./components/SettingsModal.vue";
import AddWineForm from "./components/AddWineForm.vue";
import WineQueue from "./components/WineQueue.vue";
import WineRecommendModal from "./components/WineRecommendModal.vue";
import RecommendationsResultModal from "./components/RecommendationsResultModal.vue";
import type { RecommendationHistoryEntry } from "./services/recommendations-idb";
import WineDetail from "./components/WineDetail.vue";
import { Cog6ToothIcon, PlusIcon, StarIcon } from "@heroicons/vue/24/outline";
import { getAllWines } from "./services/dexie-db";
import {
  getWineRecommendations,
  type RecommendationOption,
} from "./services/openai-recommend";

const showSettings = ref(false);
const showAddModal = ref(false);
const showRecommendModal = ref(false);
const recommendLoading = ref(false);
const recommendError = ref("");
const recommendResults = ref<RecommendationOption[] | null>(null);
const recommendQuery = ref<string>("");
const showRecommendationsResultModal = ref(false);

const showDetailModal = ref(false);
const selectedWine = ref<Wine | null>(null);

function handleShowSettings() {
  showSettings.value = true;
}

function handleSettingsSave() {
  showSettings.value = false;
}

function handleAddNew() {
  const openaiKey = localStorage.getItem("OPENAI_SDK_KEY");
  if (!openaiKey) {
    showSettings.value = true;
  } else {
    showAddModal.value = true;
  }
}

function handleShowRecommend() {
  recommendResults.value = null;
  recommendQuery.value = "";
  recommendError.value = "";
  showRecommendModal.value = true;
}

async function handleSubmitRecommendQuery(query: string) {
  recommendLoading.value = true;
  recommendError.value = "";
  recommendResults.value = null;
  recommendQuery.value = query;
  try {
    const apiKey = localStorage.getItem("OPENAI_SDK_KEY") || "";
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

function handleShowPastRecommendation(rec: RecommendationHistoryEntry) {
  recommendResults.value = rec.results;
  recommendQuery.value = rec.query;
  showRecommendModal.value = false;
  showRecommendationsResultModal.value = true;
}

async function handleShowRecommendationDetail(wineId: string) {
  // Find the wine in the user's cellar by id
  const wines = await getAllWines();
  const wine = wines.find((w) => w.id === wineId);
  if (wine) {
    selectedWine.value = wine;
    showDetailModal.value = true;
    showRecommendationsResultModal.value = false;
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header Section -->
    <div
      class="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0"
    >
      <div>
        <h1
          class="text-3xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
        >
          CellarSense
        </h1>
        <p class="text-gray-600 mt-1">
          Snap a label, let OpenAI parse it — CellarSense catalogues your cellar
          in seconds.
        </p>
      </div>
      <div class="flex gap-3">
        <button
          @click="showSettings = true"
          class="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-purple-700 border border-purple-200 rounded-xl shadow-sm transition-all hover:shadow-md"
          title="Settings"
        >
          <Cog6ToothIcon class="h-5 w-5 mr-2" />
          Settings
        </button>
        <button
          @click="handleShowRecommend"
          class="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-purple-700 border border-purple-200 rounded-xl shadow-sm transition-all hover:shadow-md"
          title="AI Wine Recommendation"
        >
          <StarIcon class="h-5 w-5 mr-2" />
          Recommend
        </button>
        <button
          @click="handleAddNew"
          class="inline-flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-xl shadow-md transform transition-all hover:shadow-lg hover:scale-105"
        >
          <PlusIcon class="h-5 w-5 mr-2" />
          Add New Wine
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
      @edit="() => {}"
    />
    <SettingsModal v-model:show="showSettings" @save="handleSettingsSave" />
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
