<script setup lang="ts">
import { ref, reactive } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import {
  exportWinesToJSON,
  importWinesFromJSON,
} from "../services/importExport";
import { settingsService, type Settings } from "../services/settings";
import type { SettingsModalProps } from "../shared/types";

// Props and emits
const props = defineProps<SettingsModalProps>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "save"): void;
}>();

// UI state
const importInput = ref<HTMLInputElement | null>(null);
const isExporting = ref<boolean>(false);
const isImporting = ref<boolean>(false);

// Initialize settings from the service
const settings = reactive<Settings>({
  DEXIE_CLOUD_URL: settingsService.dexieCloudUrl,
  OPENAI_SDK_KEY: settingsService.openAiKey,
  OPENAI_MODEL: settingsService.openAiModel,
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

// Add escape key handling
useEscapeKey(closeModal);

/**
 * Handle export button click
 */
async function handleExport(): Promise<void> {
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

/**
 * Handle file import
 */
async function handleImportFile(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files && input.files[0];
  if (!file) return;
  isImporting.value = true;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Invalid backup file");
    await importWinesFromJSON(data);
    alert("Import complete! Reload the page to see new wines.");
  } catch (err: any) {
    alert("Import failed: " + (err.message || err));
  } finally {
    isImporting.value = false;
    if (importInput.value) importInput.value.value = "";
  }
}

/**
 * Save settings
 */
function saveSettings(): void {
  // Use the settings service to save all settings at once
  const needsRefresh = settingsService.setAllSettings({
    DEXIE_CLOUD_URL: settings.DEXIE_CLOUD_URL,
    OPENAI_SDK_KEY: settings.OPENAI_SDK_KEY,
    OPENAI_MODEL: settings.OPENAI_MODEL,
  });

  emit("save");
  closeModal();

  // If DEXIE_CLOUD_URL changed, reload the page to re-init DB
  if (needsRefresh) {
    window.location.reload();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 backdrop-blur-sm"
      @click="handleOutsideClick"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-md relative border border-gray-200"
      >
        <div
          class="flex items-center justify-between px-6 pt-5 pb-2 border-b border-gray-100"
        >
          <h2 class="text-lg font-semibold text-purple-900 tracking-tight">
            Settings
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-purple-600 transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-purple-300"
            aria-label="Close settings"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>
        <div class="px-6 pt-4 pb-6">
          <div class="mb-6">
            <label
              class="block mb-1 text-xs font-semibold text-gray-600 tracking-wide uppercase"
              for="openaiKeyInput"
            >
              OpenAI API Key
            </label>
            <input
              id="openaiKeyInput"
              v-model="settings.OPENAI_SDK_KEY"
              type="password"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
              placeholder="sk-..."
              autocomplete="off"
            />
          </div>
          <div class="mb-6">
            <label
              class="block mb-1 text-xs font-semibold text-gray-600 tracking-wide uppercase"
              for="DEXIE_CLOUD_URL"
            >
              Dexie Cloud URL
            </label>
            <input
              id="DEXIE_CLOUD_URL"
              v-model="settings.DEXIE_CLOUD_URL"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
            />
          </div>
          <div class="mb-6">
            <label
              class="block mb-1 text-xs font-semibold text-gray-600 tracking-wide uppercase"
              for="OPENAI_MODEL"
            >
              OpenAI Model
            </label>
            <select
              id="OPENAI_MODEL"
              v-model="settings.OPENAI_MODEL"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
            >
              <option value="gpt-4.1">GPT-4.1 (Best Quality)</option>
              <option value="gpt-4.1-mini">
                GPT-4.1-mini (Faster, Less Accurate)
              </option>
            </select>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex gap-2">
              <button
                @click="saveSettings"
                class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex-1 transition-colors shadow-sm"
              >
                Save
              </button>
              <button
                @click="closeModal"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg flex-1 transition-colors shadow-sm border border-gray-200"
              >
                Cancel
              </button>
            </div>
            <div class="mt-5">
              <h3
                class="text-xs font-semibold text-gray-600 tracking-wide uppercase mb-2 px-1"
              >
                Import / Export
              </h3>
              <div class="grid grid-cols-2 gap-2 w-full">
                <button
                  @click="handleExport"
                  :disabled="isExporting"
                  class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-colors shadow-sm w-full"
                >
                  <svg
                    v-if="isExporting"
                    class="animate-spin h-4 w-4 mr-1"
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
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                  <span>{{ isExporting ? "Exporting…" : "Export Data" }}</span>
                </button>
                <label class="w-full cursor-pointer">
                  <input
                    ref="importInput"
                    type="file"
                    accept="application/json"
                    class="hidden"
                    @change="handleImportFile"
                    :disabled="isImporting"
                  />
                  <span
                    class="block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-center cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 transition-colors shadow-sm w-full"
                    :class="{ 'opacity-60 pointer-events-none': isImporting }"
                  >
                    <svg
                      v-if="isImporting"
                      class="animate-spin h-4 w-4 mr-1"
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
                        d="M4 12a8 8 0 018-8v8z"
                      ></path>
                    </svg>
                    <span>{{
                      isImporting ? "Importing…" : "Import Data"
                    }}</span>
                  </span>
                </label>
              </div>
              <div
                class="flex gap-2 text-xs text-gray-400 justify-between px-1 mt-1"
              >
                <span>Export: Download a backup of your wines</span>
                <span>Import: Restore from backup</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
