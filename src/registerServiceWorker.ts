// src/registerServiceWorker.ts
// Registers the PWA service worker for offline support

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      // Ignore errors, as vite-plugin-pwa will handle registration
      // and fallback gracefully in dev
      // eslint-disable-next-line no-console
      console.warn("Service worker registration failed:", err);
    });
  });
}
