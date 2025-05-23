<template>
  <div
    v-if="ui"
    class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700"
    >
      <!-- Header -->
      <div class="flex items-center mb-6">
        <img
          src="../assets/cellar-sense.svg"
          alt="CellarSense Logo"
          class="h-8 mr-3 dark:invert dark:brightness-200"
        />
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">
            CellarSense Cloud
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {{ ui.title }}
          </p>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="ui.alerts && ui.alerts.length > 0" class="mb-4 space-y-2">
        <div
          v-for="(alert, index) in ui.alerts"
          :key="index"
          :class="[
            'p-3 rounded-lg text-sm',
            {
              'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800':
                alert.type === 'error',
              'bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800':
                alert.type === 'warning',
              'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800':
                alert.type === 'info',
            },
          ]"
        >
          {{ resolveText(alert) }}
        </div>
      </div>
      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div
          v-for="([fieldName, field], index) in fieldEntries"
          :key="index"
          class="space-y-2"
        >
          <label
            v-if="field.label"
            :for="fieldName"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {{ field.label }}
          </label>
          <input
            :id="fieldName"
            :type="field.type"
            :name="fieldName"
            :placeholder="field.placeholder"
            :autofocus="index === 0"
            v-model="params[fieldName]"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            required
          />
        </div>
      </form>

      <!-- Buttons -->
      <div class="flex gap-3 mt-6">
        <button
          type="button"
          @click="handleSubmit"
          class="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          {{ ui.submitLabel }}
        </button>
        <button
          v-if="ui.cancelLabel"
          type="button"
          @click="handleCancel"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          {{ ui.cancelLabel }}
        </button>
      </div>

      <!-- Info Text -->
      <div class="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <p v-if="ui.type === 'email'">
          Enter your email to receive a one-time password for authentication.
        </p>
        <p v-else-if="ui.type === 'otp'">
          Check your email and enter the verification code we sent you.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import {
  resolveText,
  type DXCUserInteraction,
  type DXCInputField,
} from "dexie-cloud-addon";

interface Props {
  ui: DXCUserInteraction | undefined;
}

const props = defineProps<Props>();

// Form parameters state
const params = reactive<{ [param: string]: string }>({});

// Compute field entries with proper typing
const fieldEntries = computed(() => {
  if (!props.ui || !props.ui.fields) return [];
  return Object.entries(props.ui.fields) as [string, DXCInputField][];
});

// Reset params when ui changes
watch(
  () => props.ui,
  (newUi) => {
    if (newUi && newUi.fields) {
      // Initialize params with empty strings for all fields
      Object.keys(newUi.fields).forEach((fieldName) => {
        params[fieldName] = "";
      });
    }
  },
  { immediate: true }
);

function handleSubmit() {
  if (props.ui) {
    props.ui.onSubmit(params);
  }
}

function handleCancel() {
  if (props.ui?.onCancel) {
    props.ui.onCancel();
  }
}
</script>
