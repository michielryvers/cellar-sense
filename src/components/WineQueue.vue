<script setup lang="ts">
import { ref, onMounted, computed, watchEffect, onUnmounted } from "vue";
import { wineQueries$ } from "../services/winequeries-idb";
import { isOnline$ } from "../services/network-status";
import { processingStatus$ } from "../services/openai-background";
import {
  QueueListIcon,
  SignalSlashIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/vue/24/outline";
import { WineQuery } from "../services/winequeries-idb";

const loading = ref(true);
const wineQueries = ref<WineQuery[]>([]);
const isOnline = ref(navigator.onLine);
const processingStatus = ref({
  isRunning: false,
  isOnline: navigator.onLine,
  hasApiKey: false,
});
const lastStatusType = ref("");

// Store subscription cleanup functions
const unsubscribeHandlers: Array<() => void> = [];

onMounted(() => {
  loading.value = true;

  // Subscribe to Dexie's liveQuery for wine queries
  const unsubWineQueries = wineQueries$.subscribe((queries) => {
    wineQueries.value = queries;
    loading.value = false;
  });

  // In Dexie's liveQuery, the subscribe method returns a function to unsubscribe
  if (typeof unsubWineQueries === "function") {
    unsubscribeHandlers.push(unsubWineQueries);
  }

  // Subscribe to network status from RxJS observable
  const onlineSub = isOnline$.subscribe((status) => {
    isOnline.value = status;
  });

  // RxJS returns a Subscription object with an unsubscribe method
  unsubscribeHandlers.push(() => onlineSub.unsubscribe());

  // Subscribe to processing status from RxJS observable
  const processingSub = processingStatus$.subscribe((status) => {
    processingStatus.value = status;
  });

  // RxJS returns a Subscription object with an unsubscribe method
  unsubscribeHandlers.push(() => processingSub.unsubscribe());
});

onUnmounted(() => {
  // Clean up all subscriptions
  unsubscribeHandlers.forEach((unsubscribe) => unsubscribe());
});

// Computed properties for status display
const statusMessage = computed(() => {
  if (!isOnline.value) {
    return "You are currently offline. Wines will be processed when you reconnect.";
  }

  if (!processingStatus.value.hasApiKey) {
    return "OpenAI API key is missing. Please add a key in settings.";
  }

  if (processingStatus.value.isRunning) {
    return "Processing wine requests...";
  }

  if (wineQueries.value.length > 0) {
    return `${wineQueries.value.length} wine${
      wineQueries.value.length > 1 ? "s" : ""
    } waiting to be processed.`;
  }

  return "No pending wine requests.";
});

const statusType = computed(() => {
  let newStatus;

  if (!isOnline.value || !processingStatus.value.hasApiKey) {
    newStatus = "warning";
  } else if (processingStatus.value.isRunning) {
    newStatus = "processing";
  } else {
    newStatus = wineQueries.value.length > 0 ? "pending" : "success";
  }

  // Only update if it's different from the last value
  if (newStatus !== lastStatusType.value) {
    lastStatusType.value = newStatus;
  }

  return lastStatusType.value;
});
</script>

<template>
  <div class="mt-8">
    <h3
      class="text-lg font-semibold text-purple-800 mb-2 flex items-center gap-2"
    >
      <QueueListIcon class="h-6 w-6 text-purple-500" />
      Processing Queue
    </h3>
    <!-- Status Banner -->
    <div
      class="mb-4 p-3 rounded-lg flex items-center gap-3"
      :class="{
        'bg-yellow-50 text-yellow-700': statusType === 'warning',
        'bg-green-50 text-green-700': statusType === 'success',
        'bg-blue-50 text-blue-700': statusType === 'processing',
        'bg-purple-50 text-purple-700': statusType === 'pending',
      }"
      :key="statusType"
    >
      <SignalSlashIcon v-if="!isOnline" class="h-5 w-5 flex-shrink-0" />
      <KeyIcon
        v-else-if="!processingStatus.hasApiKey"
        class="h-5 w-5 flex-shrink-0"
      />
      <svg
        v-else-if="processingStatus.isRunning"
        class="h-5 w-5 animate-spin flex-shrink-0"
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
      <CheckCircleIcon
        v-else-if="wineQueries.length === 0"
        class="h-5 w-5 flex-shrink-0"
      />
      <ExclamationCircleIcon v-else class="h-5 w-5 flex-shrink-0" />
      <span>{{ statusMessage }}</span>
    </div>

    <div v-if="loading" class="text-gray-500">Loading queue…</div>
    <div v-else-if="wineQueries.length === 0" class="text-gray-400"></div>
    <ul v-else class="divide-y divide-gray-100 bg-white rounded-xl shadow p-4">
      <li
        v-for="item in wineQueries"
        :key="item.id"
        class="py-2 flex items-center gap-4"
      >
        <img
          v-if="item.frontBase64"
          :src="item.frontBase64"
          alt="Front label"
          class="w-12 h-12 object-cover rounded border"
        />
        <div class="flex-1">
          <div class="font-medium text-gray-900">
            {{ item.purchaseLocation || "Unknown store" }}
          </div>
          <div class="text-xs text-gray-500">
            Bottles: {{ item.bottles }} &middot; Queued:
            {{ new Date(item.createdAt).toLocaleString() }}
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
