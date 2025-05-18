<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
  >
    <div class="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 relative">
      <button
        class="absolute top-3 right-3 text-gray-400 hover:text-purple-600"
        @click="$emit('close')"
        aria-label="Close"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <h3 class="text-lg font-bold mb-4 text-purple-700">Recommended Wines</h3>
      <ul class="space-y-3">
        <li
          v-for="rec in results"
          :key="rec.id"
          class="border-b pb-2 last:border-b-0"
        >
          <div class="font-semibold">
            {{ rec.name }}
            <span class="text-gray-500">({{ rec.vintage }})</span>
          </div>
          <div class="text-sm text-gray-700">{{ rec.vintner }}</div>
          <div class="text-xs text-gray-500 mt-1">{{ rec.reason }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RecommendationOption } from "../services/openai-recommend";

defineProps<{
  show: boolean;
  results: RecommendationOption[];
}>();

defineEmits(["close"]);
</script>
