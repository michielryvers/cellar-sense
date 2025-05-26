import { createApp } from "vue";
import { createPinia } from "pinia";
import "./style.css";
import App from "./App.vue";
import { settingsService } from "./services/settings";

// Apply theme before app is mounted to prevent flash
settingsService.applyTheme();

const app = createApp(App);
app.use(createPinia());
app.mount("#app");

// Register PWA service worker for offline support
import "./registerServiceWorker";
import "./boot/openai-background";
