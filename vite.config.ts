import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import checker from "vite-plugin-checker";

export default defineConfig({
  base: "/cellar-sense/",
  plugins: [
    vue(),
    tailwindcss(),
    checker({
      typescript: true,
      vueTsc: true,
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
        "cellar-sense.svg",
      ],
      manifest: {
        name: "CellarSense",
        short_name: "CellarSense",
        description: "Offline-first wine cellar app for wine lovers.",
        theme_color: "#7c3aed",
        background_color: "#faf9f6",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "cellar-sense.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],
        runtimeCaching: [],
      },
    }),
  ],
});
