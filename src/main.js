import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { settingsService } from "./services/settings";

// Apply theme before app is mounted to prevent flash
settingsService.applyTheme();

// Create app with Pinia
const app = createApp(App);
app.mount("#app");

// Register PWA service worker for offline support
import "./registerServiceWorker";
import "./boot/openai-background";
