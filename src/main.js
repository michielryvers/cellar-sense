import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");

// Register PWA service worker for offline support
import "./registerServiceWorker";
import "./boot/openai-background";
