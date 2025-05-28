<script setup lang="ts">
import { ref, reactive } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { useEscapeKey } from "../composables/useEscapeKey";
import {
  exportWinesToJSON,
  importWinesFromJSON,
} from "../services/importExport";
import { settingsService, type Settings } from "../services/settings";
import {
  currentUser,
  isLoggedIn,
  login,
  logout,
} from "../services/dexie-cloud-login";
import type { SettingsModalProps } from "../shared/types";
import CalibrateRackModal from "./CalibrateRackModal.vue";
import { deleteRackAndWineLocations } from "../services/dexie-db";
import { db } from "../services/dexie-db";
import { calibrationService } from "../services/calibration-service";

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
const showCalibrateModal = ref<boolean>(false);

// Initialize settings from the service
const settings = reactive<Settings>({
  DEXIE_CLOUD_URL: settingsService.dexieCloudUrl,
  OPENAI_SDK_KEY: settingsService.openAiKey,
  OPENAI_MODEL: settingsService.openAiModel,
  THEME_PREFERENCE: settingsService.themePreference,
});

// Vision settings
const visionSettings = reactive({
  lensDistortionCorrection: calibrationService.isDistortionCorrectionEnabled(),
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
    a.download = `cellar-sense-backup-${new Date()
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
    THEME_PREFERENCE: settings.THEME_PREFERENCE,
  });

  // Save vision settings
  calibrationService.setDistortionCorrection(visionSettings.lensDistortionCorrection);

  // Apply theme right away
  settingsService.applyTheme();

  emit("save");
  closeModal();

  // If DEXIE_CLOUD_URL changed, reload the page to re-init DB
  if (needsRefresh) {
    window.location.reload();
  }
}

/**
 * Handle cloud login
 */
async function handleCloudLogin(): Promise<void> {
  try {
    await login();
  } catch (error) {
    console.error("Login failed:", error);
    alert("Login failed. Please try again.");
  }
}

/**
 * Handle cloud logout
 */
async function handleCloudLogout(): Promise<void> {
  try {
    await logout();
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Logout failed. Please try again.");
  }
}

/**
 * Open calibrate rack modal
 */
function openCalibrateModal(): void {
  // Close the settings modal first
  closeModal();
  // Then open the calibrate modal after a short delay to ensure proper transition
  setTimeout(() => {
    showCalibrateModal.value = true;
  }, 100);
}

/**
 * Handle rack calibration completed
 */
function handleRackCalibrated(rackId: string): void {
  showCalibrateModal.value = false;
  alert(`Rack calibrated successfully!`);
}

/**
 * Handle rack deletion
 */
async function handleRackDeletion(): Promise<void> {
  try {
    const racks = await db.cellarVisionDefinition.toArray();
    if (racks.length === 1) {
      await deleteRackAndWineLocations(racks[0].id);
      alert("Rack and wine locations deleted successfully!");
    } else {
      alert("Multiple racks detected. Please delete manually.");
    }
  } catch (error) {
    console.error("Rack deletion failed:", error);
    alert("Rack deletion failed. Please try again.");
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 dark:from-gray-900/90 dark:via-gray-900/90 dark:to-purple-900/90 backdrop-blur-sm"
      @click="handleOutsideClick"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-0 w-full max-w-md relative border border-gray-200 dark:border-gray-700"
      >
        <div
          class="flex items-center justify-between px-6 pt-5 pb-2 border-b border-gray-100 dark:border-gray-700"
        >
          <h2
            class="text-lg font-semibold text-purple-900 dark:text-purple-200 tracking-tight"
          >
            Settings
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-purple-300"
            aria-label="Close settings"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>
        <div class="px-6 pt-4 pb-6">
          <div class="mb-6">
            <label
              class="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase"
              for="openaiKeyInput"
            >
              OpenAI API Key
            </label>
            <input
              id="openaiKeyInput"
              v-model="settings.OPENAI_SDK_KEY"
              type="password"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-100"
              placeholder="sk-..."
              autocomplete="off"
            />
          </div>
          <div class="mb-6">
            <label
              class="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase"
              for="DEXIE_CLOUD_URL"
            >
              Dexie Cloud URL
            </label>
            <input
              id="DEXIE_CLOUD_URL"
              v-model="settings.DEXIE_CLOUD_URL"
              type="text"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-100"
            />
            <!-- Cloud Status Section -->
            <div
              v-if="settings.DEXIE_CLOUD_URL"
              class="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div class="flex items-center justify-between mb-2">
                <span
                  class="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase"
                >
                  Cloud Status
                </span>
                <div
                  :class="[
                    'w-2 h-2 rounded-full',
                    isLoggedIn ? 'bg-green-500' : 'bg-red-500',
                  ]"
                ></div>
              </div>
              <div
                v-if="isLoggedIn && currentUser?.value"
                class="text-sm text-gray-700 dark:text-gray-300 mb-2"
              >
                <p class="font-medium text-green-600 dark:text-green-400">
                  ✓ Connected
                </p>
                <p class="text-xs">
                  {{
                    currentUser.value.email || currentUser.value.name || "User"
                  }}
                </p>
              </div>
              <div v-else class="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <p class="font-medium text-red-600 dark:text-red-400">
                  ✗ Not connected
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="!isLoggedIn"
                  @click="handleCloudLogin"
                  class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors"
                >
                  Login to Cloud
                </button>
                <button
                  v-if="isLoggedIn"
                  @click="handleCloudLogout"
                  class="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
          <div class="mb-6">
            <label
              class="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase"
              for="OPENAI_MODEL"
            >
              OpenAI Model
            </label>
            <select
              id="OPENAI_MODEL"
              v-model="settings.OPENAI_MODEL"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="gpt-4.1">GPT-4.1 (Best Quality)</option>
              <option value="gpt-4.1-mini">
                GPT-4.1-mini (Faster, Less Accurate)
              </option>
            </select>
          </div>
          <div class="mb-6">
            <label
              class="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase"
              for="THEME_PREFERENCE"
            >
              Theme
            </label>
            <select
              id="THEME_PREFERENCE"
              v-model="settings.THEME_PREFERENCE"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>          </div>
          <div class="mb-6">
            <h3
              class="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase mb-3"
            >
              Vision Settings
            </h3>
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  for="lensDistortionToggle"
                >
                  Lens Distortion Correction
                </label>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Corrects barrel distortion from wide-angle phone cameras for better marker detection
                </p>
              </div>
              <div class="ml-4">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    id="lensDistortionToggle"
                    v-model="visionSettings.lensDistortionCorrection"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"
                  ></div>
                </label>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex gap-2">
              <button
                @click="saveSettings"
                class="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white font-bold py-2 px-4 rounded-lg flex-1 transition-colors shadow-sm"
              >
                Save
              </button>
              <button
                @click="closeModal"
                class="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-2 px-4 rounded-lg flex-1 transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
              >
                Cancel
              </button>
            </div>
            <div class="mt-5">
              <h3
                class="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase mb-2 px-1"
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
                class="flex gap-2 text-xs text-gray-400 dark:text-gray-500 justify-between px-1 mt-1"
              >
                <span>Export: Download a backup of your wines</span>
                <span>Import: Restore from backup</span>
              </div>
            </div>
            <div class="mt-5">
              <h3
                class="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase mb-2 px-1"
              >
                Rack Calibration
              </h3>
              <button
                @click="openCalibrateModal"
                class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm w-full mb-2"
              >
                Calibrate Rack
              </button>
              <p class="text-xs text-gray-400 dark:text-gray-500 px-1">
                Set up ArUco markers to locate your wine bottles in AR
              </p>
            </div>
            <div class="mt-5">
              <h3
                class="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase mb-2 px-1"
              >
                Rack Management
              </h3>
              <button
                @click="handleRackDeletion"
                class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm w-full mb-2"
              >
                Delete Rack & Wine Locations
              </button>
              <p class="text-xs text-gray-400 dark:text-gray-500 px-1">
                Deletes the rack calibration and all associated wine locations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Calibrate Rack Modal - This will render separately through its own Teleport -->
  <CalibrateRackModal
    :is-open="showCalibrateModal"
    @close="showCalibrateModal = false"
    @calibrated="handleRackCalibrated"
  />
</template>
