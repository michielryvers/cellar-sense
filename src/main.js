import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import "./style.css";
import App from "./App.vue";
import { settingsService } from "./services/settings";

// Apply theme before app is mounted to prevent flash
settingsService.applyTheme();

// Create Pinia instance with persistence plugin
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Create app with Pinia
const app = createApp(App);
app.use(pinia);
app.mount("#app");

// Register PWA service worker for offline support
import "./registerServiceWorker";
import "./boot/openai-background";
