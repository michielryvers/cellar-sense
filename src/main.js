import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { settingsService } from "./services/settings";

// Apply theme before app is mounted to prevent flash
settingsService.applyTheme();

createApp(App).mount("#app");

// Register PWA service worker for offline support
import "./registerServiceWorker";
import "./boot/openai-background";
