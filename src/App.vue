<script setup>
import { ref } from "vue";
import WineTable from "./components/WineTable.vue";
import SettingsModal from "./components/SettingsModal.vue";

const showSettings = ref(false);

function handleShowSettings() {
  showSettings.value = true;
}

function handleSettingsSave() {
  // You can add any additional logic here if needed when settings are saved
  showSettings.value = false;
}
</script>

<template>
  <WineTable @show-settings="handleShowSettings" />

  <SettingsModal v-model:show="showSettings" @save="handleSettingsSave" />
</template>

<style>
@import "./style.css";

#app {
  max-width: 1280px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
