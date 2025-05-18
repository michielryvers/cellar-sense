<script setup lang="ts">
import { ref } from "vue";
import { StarIcon, XMarkIcon } from "@heroicons/vue/24/outline";

const props = defineProps<{ show: boolean; loading: boolean; error: string }>();
const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "submit-query", query: string): void;
}>();

const userQuery = ref("");

function closeModal() {
  emit("update:show", false);
  userQuery.value = "";
}

function handleSubmit() {
  if (userQuery.value.trim()) {
    emit("submit-query", userQuery.value.trim());
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-400 bg-opacity-40"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 relative">
        <div class="flex justify-between items-center mb-4">
          <h2
            class="text-xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
          >
            Ask for a Wine Recommendation
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Describe your meal, occasion, mood, or anything else:
          </label>
          <textarea
            v-model="userQuery"
            rows="4"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="e.g. Steak dinner with friends, birthday, feeling adventurous..."
            :disabled="loading"
            required
          />
          <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
          <button
            type="submit"
            :disabled="loading || !userQuery.trim()"
            class="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          >
            <StarIcon class="h-5 w-5 mr-2" />
            <span>Get Recommendations</span>
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>
