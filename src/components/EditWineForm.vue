<script setup lang="ts">
import { ref, toRaw } from "vue";
import {
  XMarkIcon,
  PlusIcon,
  MinusCircleIcon,
} from "@heroicons/vue/24/outline";
import { updateWine } from "../services/dexie-db";
import type { Wine } from "../shared/Wine";

interface EditWineFormProps {
  show: boolean;
  wine: Wine;
}

const props = defineProps<EditWineFormProps>();

const emit = defineEmits<{
  "update:show": [show: boolean];
  "wine-updated": [];
}>();

const formData = ref<Wine>({
  id: props.wine.id,
  name: props.wine.name || "",
  vintner: props.wine.vintner || "",
  vintage: props.wine.vintage || "",
  appellation: props.wine.appellation || "",
  region: props.wine.region || "",
  color: props.wine.color || "Red",
  volume: props.wine.volume || "",
  alcohol: props.wine.alcohol || "",
  farming: props.wine.farming || "",
  inventory: {
    bottles: props.wine.inventory?.bottles || 0,
    purchaseDate: props.wine.inventory?.purchaseDate
      ? typeof props.wine.inventory.purchaseDate === "string"
        ? props.wine.inventory.purchaseDate.split("T")[0]
        : ""
      : "",
    purchaseLocation: props.wine.inventory?.purchaseLocation || "",
  },
  grapes: Array.isArray(props.wine.grapes)
    ? [...props.wine.grapes] // already an array
    : props.wine.grapes // object → array
    ? (Object.entries(props.wine.grapes) as [string, number][]).map(
        ([name, percentage]) => ({ name, percentage })
      )
    : [],
  vinification: Array.isArray(props.wine.vinification)
    ? [...props.wine.vinification] // already an array
    : props.wine.vinification // object → array
    ? (Object.entries(props.wine.vinification) as [string, string][]).map(
        ([step, description]) => ({ step, description })
      )
    : [],
  tasting_notes: {
    nose: props.wine.tasting_notes?.nose || [],
    palate: props.wine.tasting_notes?.palate || [],
  },
  drink_from: props.wine.drink_from || "",
  drink_until: props.wine.drink_until || "",
  price: props.wine.price || "",
  sulfites: props.wine.sulfites || "",
  images: {
    front: props.wine.images.front,
    back: props.wine.images.back,
  },
});

const error = ref<string>("");
const isLoading = ref<boolean>(false);

const wineColors: string[] = [
  "Red",
  "White",
  "Rosé",
  "Orange",
  "Sparkling",
  "Dessert",
  "Other",
];

function addGrape(): void {
  formData.value.grapes.push({ name: "", percentage: 0 });
}

function removeGrape(index: number): void {
  formData.value.grapes.splice(index, 1);
}

function addVinificationStep(): void {
  formData.value.vinification.push({ step: "", description: "" });
}

function removeVinificationStep(index: number): void {
  formData.value.vinification.splice(index, 1);
}

function addTastingNote(type: "nose" | "palate"): void {
  formData.value.tasting_notes[type].push("");
}

function removeTastingNote(type: "nose" | "palate", index: number): void {
  formData.value.tasting_notes[type].splice(index, 1);
}

async function handleSubmit(): Promise<void> {
  try {
    isLoading.value = true;
    error.value = "";

    // Create a clean, non-reactive object for storage

    const cleanFormData = toRaw<Wine>(formData.value);

    // Ensure purchaseDate is always a date string (YYYY-MM-DD)
    let purchaseDate = cleanFormData.inventory.purchaseDate || "";
    if (purchaseDate && purchaseDate.includes("T")) {
      purchaseDate = purchaseDate.split("T")[0];
    }

    const wineData: Wine = {
      id: cleanFormData.id,
      name: cleanFormData.name,
      vintner: cleanFormData.vintner,
      vintage: cleanFormData.vintage,
      appellation: cleanFormData.appellation,
      region: cleanFormData.region,
      color: cleanFormData.color,
      volume: cleanFormData.volume,
      alcohol: cleanFormData.alcohol,
      farming: cleanFormData.farming,
      inventory: {
        ...cleanFormData.inventory,
        purchaseDate,
      },
      grapes: cleanFormData.grapes.map((grape) => toRaw(grape)),
      vinification: cleanFormData.vinification.map((step) => toRaw(step)),
      tasting_notes: {
        nose: cleanFormData.tasting_notes.nose.map((note) => toRaw(note)),
        palate: cleanFormData.tasting_notes.palate.map((palate) =>
          toRaw(palate)
        ),
      },
      drink_from: cleanFormData.drink_from,
      drink_until: cleanFormData.drink_until,
      price: cleanFormData.price,
      sulfites: cleanFormData.sulfites,
      images: {
        front: cleanFormData.images.front,
        back: cleanFormData.images.back,
      },
    };

    await updateWine(wineData);
    emit("wine-updated");
    closeModal();
  } catch (err: any) {
    error.value = err.message || "Failed to update wine";
    console.error("Error updating wine:", err);
  } finally {
    isLoading.value = false;
  }
}

function closeModal(): void {
  emit("update:show", false);
}

function handleOutsideClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    closeModal();
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
        class="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-8 relative"
      >
        <!-- Header -->
        <div
          class="flex justify-between items-center mb-6 border-b border-gray-100 pb-4"
        >
          <h2
            class="text-2xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
          >
            Edit Wine Details
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-8">
          <div
            v-if="error"
            class="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-4 shadow-sm"
          >
            {{ error }}
          </div>

          <!-- Form Sections -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Basic Info Section -->
            <div class="lg:col-span-1 space-y-6 bg-gray-50 p-6 rounded-xl">
              <h3 class="font-semibold text-gray-800 text-lg mb-4">
                Basic Information
              </h3>
              <div class="space-y-6">
                <div>
                  <label
                    for="wineName"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Wine Name<span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="wineName"
                    v-model="formData.name"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter wine name"
                  />
                </div>

                <div>
                  <label
                    for="wineVintner"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Vintner<span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="wineVintner"
                    v-model="formData.vintner"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter vintner name"
                  />
                </div>

                <div>
                  <label
                    for="wineVintage"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Vintage
                  </label>
                  <input
                    type="number"
                    id="wineVintage"
                    v-model="formData.vintage"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter vintage year"
                  />
                </div>

                <div>
                  <label
                    for="wineColor"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Color<span class="text-red-500">*</span>
                  </label>
                  <select
                    id="wineColor"
                    v-model="formData.color"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Select wine color</option>
                    <option
                      v-for="color in wineColors"
                      :key="color"
                      :value="color"
                    >
                      {{ color }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Wine Details -->
            <div class="lg:col-span-2 grid grid-cols-1 gap-8">
              <!-- Region & Classification -->
              <div class="bg-gray-50 p-6 rounded-xl">
                <h3 class="font-semibold text-gray-800 text-lg mb-4">
                  Region & Classification
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      for="wineAppellation"
                      class="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Appellation
                    </label>
                    <input
                      type="text"
                      id="wineAppellation"
                      v-model="formData.appellation"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter appellation"
                    />
                  </div>

                  <div>
                    <label
                      for="wineRegion"
                      class="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Region
                    </label>
                    <input
                      type="text"
                      id="wineRegion"
                      v-model="formData.region"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter region"
                    />
                  </div>
                </div>
              </div>

              <!-- Technical Details -->
              <div class="bg-gray-50 p-6 rounded-xl">
                <h3 class="font-semibold text-gray-800 text-lg mb-4">
                  Technical Details
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label
                      for="wineVolume"
                      class="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Volume
                    </label>
                    <input
                      type="text"
                      id="wineVolume"
                      v-model="formData.volume"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="e.g., 750ml"
                    />
                  </div>

                  <div>
                    <label
                      for="wineAlcohol"
                      class="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Alcohol
                    </label>
                    <input
                      type="text"
                      id="wineAlcohol"
                      v-model="formData.alcohol"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="e.g., 13.5%"
                    />
                  </div>

                  <div>
                    <label
                      for="wineFarming"
                      class="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Farming
                    </label>
                    <input
                      type="text"
                      id="wineFarming"
                      v-model="formData.farming"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="e.g., Organic"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Grapes Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-semibold text-gray-800 text-lg">
                Grape Varieties
              </h3>
              <button
                type="button"
                @click="addGrape"
                class="inline-flex items-center px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
              >
                <PlusIcon class="h-5 w-5 mr-2" />
                Add Grape
              </button>
            </div>
            <div class="space-y-3">
              <div
                v-for="(grape, index) in formData.grapes"
                :key="'grape-' + index"
                class="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm"
              >
                <input
                  type="text"
                  v-model="grape.name"
                  class="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Grape variety"
                />
                <input
                  type="number"
                  v-model="grape.percentage"
                  min="0"
                  max="100"
                  class="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="%"
                />
                <button
                  type="button"
                  @click="removeGrape(index)"
                  class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <MinusCircleIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Vinification Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-semibold text-gray-800 text-lg">
                Vinification Steps
              </h3>
              <button
                type="button"
                @click="addVinificationStep"
                class="inline-flex items-center px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
              >
                <PlusIcon class="h-5 w-5 mr-2" />
                Add Step
              </button>
            </div>
            <div class="space-y-3">
              <div
                v-for="(step, index) in formData.vinification"
                :key="'vinification-' + index"
                class="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm"
              >
                <input
                  type="text"
                  v-model="step.step"
                  class="w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Step name"
                />
                <input
                  type="text"
                  v-model="step.description"
                  class="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Description"
                />
                <button
                  type="button"
                  @click="removeVinificationStep(index)"
                  class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <MinusCircleIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Tasting Notes -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Nose -->
            <div class="bg-gray-50 p-6 rounded-xl">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-semibold text-gray-800 text-lg">Nose</h3>
                <button
                  type="button"
                  @click="addTastingNote('nose')"
                  class="inline-flex items-center px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <PlusIcon class="h-5 w-5 mr-2" />
                  Add Note
                </button>
              </div>
              <div class="space-y-3">
                <div
                  v-for="(note, index) in formData.tasting_notes.nose"
                  :key="'nose-' + index"
                  class="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm"
                >
                  <input
                    type="text"
                    v-model="formData.tasting_notes.nose[index]"
                    class="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Nose characteristic"
                  />
                  <button
                    type="button"
                    @click="removeTastingNote('nose', index)"
                    class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <MinusCircleIcon class="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Palate -->
            <div class="bg-gray-50 p-6 rounded-xl">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-semibold text-gray-800 text-lg">Palate</h3>
                <button
                  type="button"
                  @click="addTastingNote('palate')"
                  class="inline-flex items-center px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <PlusIcon class="h-5 w-5 mr-2" />
                  Add Note
                </button>
              </div>
              <div class="space-y-3">
                <div
                  v-for="(note, index) in formData.tasting_notes.palate"
                  :key="'palate-' + index"
                  class="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm"
                >
                  <input
                    type="text"
                    v-model="formData.tasting_notes.palate[index]"
                    class="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Palate characteristic"
                  />
                  <button
                    type="button"
                    @click="removeTastingNote('palate', index)"
                    class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <MinusCircleIcon class="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Inventory Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">Inventory</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  for="bottles"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Number of Bottles
                </label>
                <input
                  type="number"
                  id="bottles"
                  v-model="formData.inventory.bottles"
                  min="0"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label
                  for="purchaseDate"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Purchase Date
                </label>
                <input
                  type="date"
                  id="purchaseDate"
                  v-model="formData.inventory.purchaseDate"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label
                  for="purchaseLocation"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Purchase Location
                </label>
                <input
                  type="text"
                  id="purchaseLocation"
                  v-model="formData.inventory.purchaseLocation"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Where did you buy it?"
                />
              </div>
            </div>
          </div>

          <!-- Drinking Window Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">
              Drinking Window
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  for="drinkFrom"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Drink From
                </label>
                <input
                  type="number"
                  id="drinkFrom"
                  v-model="formData.drink_from"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Start year"
                />
              </div>

              <div>
                <label
                  for="drinkUntil"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Drink Until
                </label>
                <input
                  type="number"
                  id="drinkUntil"
                  v-model="formData.drink_until"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="End year"
                />
              </div>

              <div>
                <label
                  for="price"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Price
                </label>
                <input
                  type="text"
                  id="price"
                  v-model="formData.price"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="e.g., €10.50"
                />
              </div>
            </div>
          </div>

          <!-- Additional Details Section -->
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold text-gray-800 text-lg mb-4">
              Additional Details
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  for="sulfites"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Sulfites
                </label>
                <input
                  type="text"
                  id="sulfites"
                  v-model="formData.sulfites"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="e.g., Low-sulfite"
                />
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-6">
            <button
              type="button"
              @click="closeModal"
              class="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <span v-if="isLoading" class="flex items-center">
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
                Saving...
              </span>
              <span v-else>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
