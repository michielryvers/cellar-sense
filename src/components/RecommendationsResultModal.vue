<script setup lang="ts">
import type { RecommendationOption, RecommendationsResultModalProps } from "../shared/types";

defineProps<RecommendationsResultModalProps>();

defineEmits<{
  (e: "close"): void;
  (e: "show-detail", id: string): void;
}>();
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-100/80 via-white/80 to-pink-100/80 backdrop-blur-sm"
  >
    <div
      class="relative bg-white/90 rounded-2xl shadow-2xl max-w-lg w-full px-0 py-0 overflow-hidden border border-purple-100"
    >
      <div
        class="flex items-center justify-between px-6 pt-6 pb-2 border-b border-purple-50 bg-gradient-to-r from-purple-50/80 to-pink-50/80"
      >
        <h3 class="text-xl font-extrabold text-purple-700 tracking-tight">
          🍷 Recommended Wines
        </h3>
        <button
          class="rounded-full p-2 hover:bg-purple-100 transition-colors text-gray-400 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-300"
          @click="$emit('close')"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div
        v-if="query"
        class="px-6 pt-3 pb-1 text-sm text-purple-900/80 italic"
      >
        <span class="font-semibold text-purple-700">Your query:</span>
        <span> {{ query }} </span>
      </div>
      <ul
        class="divide-y divide-purple-50 px-6 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200/60 scrollbar-track-transparent"
      >
        <li
          v-for="rec in results"
          :key="rec.id"
          class="py-3 flex flex-col gap-1 hover:bg-purple-50/40 rounded-lg transition-colors px-2"
        >
          <div class="flex items-center gap-2">
            <span class="block w-2 h-2 rounded-full bg-purple-300"></span>
            <button
              type="button"
              class="font-semibold text-purple-700 text-base underline underline-offset-2 hover:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-colors"
              @click="$emit('show-detail', rec.id)"
            >
              {{ rec.name }}
            </button>
            <span class="text-xs text-purple-500 font-medium ml-1"
              >({{ rec.vintage }})</span
            >
          </div>
          <div class="text-sm text-gray-700 font-medium">{{ rec.vintner }}</div>
          <div class="text-xs text-gray-500 mt-1 italic">{{ rec.reason }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>
