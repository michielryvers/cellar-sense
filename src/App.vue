<script setup lang="ts">
import { ref } from "vue";
import WineTable from "./components/WineTable.vue";
import SettingsModal from "./components/SettingsModal.vue";
import AddWineForm from "./components/AddWineForm.vue";
import { Cog6ToothIcon, PlusIcon } from "@heroicons/vue/24/outline";

const showSettings = ref(false);
const showAddModal = ref(false);

function handleShowSettings() {
  showSettings.value = true;
}

function handleSettingsSave() {
  // You can add any additional logic here if needed when settings are saved
  showSettings.value = false;
}

function handleAddNew() {
  const openaiKey = localStorage.getItem("openai_api_key");
  if (!openaiKey) {
    showSettings.value = true;
  } else {
    showAddModal.value = true;
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
          @click="handleAddNew"
          class="inline-flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-xl shadow-md transform transition-all hover:shadow-lg hover:scale-105"
        >
          <PlusIcon class="h-5 w-5 mr-2" />
          Add New Wine
        </button>
      </div>
    </div>

    <WineTable />

    <AddWineForm
      v-model:show="showAddModal"
      @wine-added="showAddModal = false"
      @missing-api-key="showSettings = true"
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
