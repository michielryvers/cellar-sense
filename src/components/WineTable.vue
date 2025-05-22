<script setup lang="ts">
import { ref, Ref, onUnmounted, computed } from "vue";
import { deleteWine, updateWine, db, drinkBottle } from "../services/dexie-db";
import {
  ClockIcon,
  MinusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import WineDetail from "./WineDetail.vue";
import EditWineForm from "./EditWineForm.vue";
import DrinkWineModal from "./DrinkWineModal.vue";
import { useEscapeKey } from "../composables/useEscapeKey";
import type { Wine, WineConsumption } from "../shared/Wine";
import { liveQuery } from "dexie";

const wines: Ref<Wine[]> = ref([]);
const filterVintner = ref<string>("");
const filterColor = ref<string>("");

// Compute unique vintners and colors for dropdowns
const vintnerOptions = computed(() => {
  const set = new Set<string>();
  wines.value.forEach((w) => {
    if (w.vintner) set.add(w.vintner);
  });
  return Array.from(set).sort();
});
const colorOptions = computed(() => {
  const set = new Set<string>();
  wines.value.forEach((w) => {
    if (w.color) set.add(w.color);
  });
  return Array.from(set).sort();
});

const filteredWines = computed(() => {
  return wines.value.filter((wine) => {
    const vintnerMatch =
      !filterVintner.value || wine.vintner === filterVintner.value;
    const colorMatch = !filterColor.value || wine.color === filterColor.value;
    return vintnerMatch && colorMatch; // UPDATED
  });
});
let subscription: any;
const showDetailModal = ref(false);
const showEditModal = ref(false);
const showDrinkModal = ref(false);
const selectedWine: Ref<Wine | null> = ref(null);

const emit = defineEmits<{
  (e: "showSettings"): void;
}>();

// Handle escape key for closing modals
useEscapeKey(() => {
  if (showDetailModal.value) {
    showDetailModal.value = false;
  } else if (showEditModal.value) {
    showEditModal.value = false;
  } else if (showDrinkModal.value) {
    showDrinkModal.value = false;
  }
});

// liveQuery subscription for real-time updates
function loadWines(): void {
  // No-op, kept for compatibility with EditWineForm and others
}

subscription = liveQuery(() => db.wines.toArray()).subscribe({
  next: (result: Wine[]) => {
    wines.value = result;
  },
  error: (err: any) => {
    console.error("liveQuery error", err);
  },
});

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe();
  }
});

defineExpose({ loadWines });

async function handleDelete(
  id: string | undefined,
  event: Event
): Promise<void> {
  event.stopPropagation();
  if (!id) return;

  if (confirm("Are you sure you want to delete this wine?")) {
    await deleteWine(id);
    // No need to reload, liveQuery will update automatically
  }
}

function handleEdit(wine: Wine, event?: Event): void {
  // Only stop propagation if event exists (clicked from table)
  if (event) {
    event.stopPropagation();
  }
  selectedWine.value = wine;
  showEditModal.value = true;
}

function handleRowClick(wine: Wine): void {
  selectedWine.value = wine;
  showDetailModal.value = true;
}

async function handleDrink(wine: Wine, event: Event): Promise<void> {
  event.stopPropagation();
  selectedWine.value = wine;
  showDrinkModal.value = true;
}

async function handleSaveConsumption(
  consumption: WineConsumption
): Promise<void> {
  if (selectedWine.value?.id) {
    await drinkBottle(selectedWine.value.id, {
      rating: consumption.rating,
      notes: consumption.notes,
    });
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Responsive Table/List Section -->
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      <!-- Desktop Table -->
      <div class="hidden sm:block">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-gray-800 dark:to-gray-700">
              <th
                class="py-3 px-4 text-left text-xs font-semibold text-purple-900 dark:text-purple-200"
              >
                Name
              </th>
              <th
                class="py-3 px-4 text-left text-xs font-semibold text-purple-900 dark:text-purple-200"
              >
                <div class="flex items-center gap-1">
                  <select
                    v-model="filterVintner"
                    class="ml-1 px-2 py-0.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  >
                    <option value="">Vintner</option>
                    <option v-for="v in vintnerOptions" :key="v" :value="v">
                      {{ v }}
                    </option>
                  </select>
                </div>
              </th>
              <th
                class="py-3 px-4 text-left text-xs font-semibold text-purple-900"
              >
                Vintage
              </th>
              <th
                class="py-3 px-4 text-left text-xs font-semibold text-purple-900"
              >
                <div class="flex items-center gap-1">
                  <select
                    v-model="filterColor"
                    class="ml-1 px-2 py-0.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  >
                    <option value="">Color</option>
                    <option v-for="c in colorOptions" :key="c" :value="c">
                      {{ c }}
                    </option>
                  </select>
                </div>
              </th>
              <th
                class="py-3 px-4 text-left text-xs font-semibold text-purple-900 dark:text-purple-200"
              >
                Region
              </th>
              <th
                class="py-3 px-4 text-center text-xs font-semibold text-purple-900 dark:text-purple-200"
              >
                Bottles
              </th>
              <th class="py-3 px-4 w-28">
                <button
                  v-if="filterVintner || filterColor"
                  @click="
                    filterVintner = '';
                    filterColor = '';
                  "
                  class="text-xs text-gray-500 underline"
                >
                  Clear
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="filteredWines.length === 0">
              <td colspan="7" class="py-8 px-6 text-center text-gray-500 dark:text-gray-400">
                <div
                  class="flex flex-col items-center justify-center space-y-3"
                >
                  <ClockIcon class="h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <p class="text-lg font-medium">No wines in inventory</p>
                  <p class="text-sm text-gray-400 dark:text-gray-500">
                    Add your first wine to get started
                  </p>
                </div>
              </td>
            </tr>
            <tr
              v-for="wine in filteredWines"
              :key="wine.id"
              class="group hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
              :class="{ 'opacity-60': wine.inventory?.bottles === 0 }"
              @click="handleRowClick(wine)"
            >
              <td class="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                {{ wine.name }}
              </td>
              <td class="py-3 px-4 text-gray-600 dark:text-gray-300">{{ wine.vintner }}</td>
              <td class="py-3 px-4 text-gray-600 dark:text-gray-300">{{ wine.vintage }}</td>
              <td class="py-3 px-4">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="{
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': wine.color === 'Red',
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300': wine.color === 'White',
                    'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300': wine.color === 'Rosé',
                    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300': wine.color === 'Orange',
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': wine.color === 'Sparkling',
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300': wine.color === 'Dessert',
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': wine.color === 'Other',
                  }"
                >
                  {{ wine.color }}
                </span>
              </td>
              <td class="py-3 px-4 text-gray-600">{{ wine.region }}</td>
              <td class="py-3 px-4">
                <div class="flex justify-center">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="{
                      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300':
                        wine.inventory?.bottles > 3,
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300':
                        wine.inventory?.bottles > 0 &&
                        wine.inventory?.bottles <= 3,
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': !wine.inventory?.bottles,
                    }"
                  >
                    {{ wine.inventory?.bottles || 0 }}
                  </span>
                </div>
              </td>
              <td class="py-3 px-4">
                <div
                  class="flex justify-end items-center space-x-2 opacity-40 group-hover:opacity-80 transition-opacity"
                >
                  <button
                    v-if="wine.inventory?.bottles > 0"
                    @click="handleDrink(wine, $event)"
                    class="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 p-1 rounded-lg transition-colors"
                    :aria-label="'Drink a bottle of ' + wine.name"
                    :title="
                      'Mark one bottle as consumed (' +
                      (wine.inventory?.bottles || 0) +
                      ' remaining)'
                    "
                  >
                    <MinusCircleIcon class="h-5 w-5" />
                  </button>
                  <button
                    @click="handleEdit(wine, $event)"
                    class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded-lg transition-colors"
                    :aria-label="'Edit ' + wine.name"
                    :title="'Edit details for ' + wine.name"
                  >
                    <PencilSquareIcon class="h-5 w-5" />
                  </button>
                  <button
                    @click="handleDelete(wine.id, $event)"
                    class="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded-lg transition-colors"
                    :aria-label="'Delete ' + wine.name"
                    :title="'Delete ' + wine.name + ' from inventory'"
                  >
                    <TrashIcon class="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Mobile Card/List -->
      <div class="sm:hidden">
        <div
          v-if="wines.length === 0"
          class="py-8 px-4 text-center text-gray-500 dark:text-gray-400"
        >
          <div class="flex flex-col items-center justify-center space-y-3">
            <ClockIcon class="h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p class="text-lg font-medium">No wines in inventory</p>
            <p class="text-sm text-gray-400 dark:text-gray-500">
              Add your first wine to get started
            </p>
          </div>
        </div>
        <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
          <li
            v-for="wine in filteredWines"
            :key="wine.id"
            class="group px-3 py-3 flex flex-col gap-1 bg-white hover:bg-purple-50 transition-colors cursor-pointer relative"
            :class="{ 'opacity-60': wine.inventory?.bottles === 0 }"
            @click="handleRowClick(wine)"
          >
            <div class="flex items-center justify-between">
              <div class="font-semibold text-gray-900 text-base">
                {{ wine.name }}
              </div>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="{
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300':
                    wine.inventory?.bottles > 3,
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300':
                    wine.inventory?.bottles > 0 && wine.inventory?.bottles <= 3,
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': !wine.inventory?.bottles,
                }"
              >
                {{ wine.inventory?.bottles || 0 }}
              </span>
            </div>
            <div
              class="flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-600 mt-1"
            >
              <span>{{ wine.vintner }}</span>
              <span>•</span>
              <span>{{ wine.vintage }}</span>
              <span>•</span>
              <span>{{ wine.region }}</span>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="{
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': wine.color === 'Red',
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300': wine.color === 'White',
                  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300': wine.color === 'Rosé',
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300': wine.color === 'Orange',
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': wine.color === 'Sparkling',
                  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300': wine.color === 'Dessert',
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': wine.color === 'Other',
                }"
              >
                {{ wine.color }}
              </span>
              <div class="flex-1"></div>
              <div
                class="flex items-center space-x-1 opacity-40 group-hover:opacity-80 transition-opacity"
              >
                <button
                  v-if="wine.inventory?.bottles > 0"
                  @click.stop="handleDrink(wine, $event)"
                  class="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 p-1 rounded-lg transition-colors"
                  :aria-label="'Drink a bottle of ' + wine.name"
                  :title="
                    'Mark one bottle as consumed (' +
                    (wine.inventory?.bottles || 0) +
                    ' remaining)'
                  "
                >
                  <MinusCircleIcon class="h-5 w-5" />
                </button>
                <button
                  @click.stop="handleEdit(wine, $event)"
                  class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded-lg transition-colors"
                  :aria-label="'Edit ' + wine.name"
                  :title="'Edit details for ' + wine.name"
                >
                  <PencilSquareIcon class="h-5 w-5" />
                </button>
                <button
                  @click.stop="handleDelete(wine.id, $event)"
                  class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition-colors"
                  :aria-label="'Delete ' + wine.name"
                  :title="'Delete ' + wine.name + ' from inventory'"
                >
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <WineDetail
        v-if="selectedWine"
        v-model:show="showDetailModal"
        :wine="selectedWine"
        @edit="handleEdit"
      />
      <EditWineForm
        v-if="selectedWine"
        :key="selectedWine.id"
        v-model:show="showEditModal"
        :wine="selectedWine"
        @wine-updated="loadWines"
      />
      <DrinkWineModal
        v-if="selectedWine"
        v-model:show="showDrinkModal"
        :wine="selectedWine"
        @save="handleSaveConsumption"
      />
    </Teleport>
  </div>
</template>
