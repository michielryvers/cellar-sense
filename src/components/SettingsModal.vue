<script setup>
import { ref, onMounted } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import {
  exportWinesToJSON,
  importWinesFromJSON,
} from "../services/importExport";

const props = defineProps({ show: { type: Boolean, required: true } });
const emit = defineEmits(["update:show", "save"]);
const apiKey = ref("");
const importInput = ref(null);
const isExporting = ref(false);
const isImporting = ref(false);

onMounted(() => {
  // Pre-fill input if key exists
  apiKey.value = localStorage.getItem("openai_api_key") || "";
});

function handleSave() {
  const key = apiKey.value.trim();
  if (key) {
    localStorage.setItem("openai_api_key", key);
  } else {
    localStorage.removeItem("openai_api_key");
  }
  emit("save");
  closeModal();
}

function closeModal() {
  emit("update:show", false);
}

function handleOutsideClick(e) {
  if (e.target === e.currentTarget) {
    closeModal();
  }
}

// Add escape key handling
useEscapeKey(closeModal);

async function handleExport() {
  isExporting.value = true;
  try {
    const blob = await exportWinesToJSON();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wineventory-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } finally {
    isExporting.value = false;
  }
}

async function handleImportFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  isImporting.value = true;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Invalid backup file");
    await importWinesFromJSON(data);
    alert("Import complete! Reload the page to see new wines.");
  } catch (err) {
    alert("Import failed: " + (err.message || err));
  } finally {
    isImporting.value = false;
    if (importInput.value) importInput.value.value = "";
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
      <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-purple-800">Settings</h2>
          <button
            @click="closeModal"
            class="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close
settings"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>
        <label
          class="block mb-2 text-sm font-medium text-gray-700"
          for="openaiKeyInput"
        >
          OpenAI API Key
        </label>
        <input
          id="openaiKeyInput"
          v-model="apiKey"
          type="password"
          class="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="sk-..."
          autocomplete="off"
          @keyup.enter="handleSave"
        />
        <div class="flex flex-col gap-3 mt-4">
          <div class="flex gap-2">
            <button
              @click="handleSave"
              class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex-1"
            >
              Save
            </button>
            <button
              @click="closeModal"
              class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded flex-1"
            >
              Cancel
            </button>
          </div>
          <div class="flex gap-2 mt-2">
            <button
              @click="handleExport"
              :disabled="isExporting"
              class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded flex-1 disabled:opacity-60"
            >
              {{ isExporting ? "Exporting…" : "Export Data" }}
            </button>
            <label class="flex-1">
              <input
                ref="importInput"
                type="file"
                accept="application/json"
                class="hidden"
                @change="handleImportFile"
                :disabled="isImporting"
              />
              <span
                class="block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-center cursor-pointer disabled:opacity-60"
                :class="{ 'opacity-60 pointer-events-none': isImporting }"
              >
                {{ isImporting ? "Importing…" : "Import Data" }}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
