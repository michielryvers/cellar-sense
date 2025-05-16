# CellarSense 🍷📲

A **Progressive Web App** for tracking the bottles you love, right on your phone – no cloud, no sign-in, 100 % offline-first!

<div align="center">
  <img src="https://img.shields.io/badge/Vue-3-42b883?logo=vue.js" />
  <img src="https://img.shields.io/badge/Vite-%E2%9A%A1-purple?logo=vite" />
  <img src="https://img.shields.io/badge/PWA-ready-5a0fc8" />
  <img src="https://img.shields.io/badge/TailwindCSS-^3-38bdf8?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</div>

---

## ✨ Features

- ⚡️ Installable PWA (Add to Home Screen, works offline)
- 🗂 Local-only storage with IndexedDB (your data never leaves the device)
- 📸 Add wines by snapping front & back label photos
- 🤖 OpenAI integration to auto-fill wine details
- 🪄 Tailwind-powered UI

---

## ⚙️ Tech Stack

| Layer     | Package / API                  |
| --------- | ------------------------------ |
| Framework | Vue 3 + `<script setup>`       |
| Build     | Vite                           |
| Styling   | Tailwind CSS                   |
| Local DB  | `idb` (tiny IndexedDB wrapper) |
| AI        | OpenAI API (user supplies key) |

---

## 🏁 Quick Start

```bash
# clone & install deps
git clone https://github.com/<you>/wineventory.git
cd wineventory
npm install   # or pnpm / yarn

# start dev server
npm run dev
```

Open `http://localhost:5173` and hack away! Hot-reload included.

Or just use the [hosted version](https://michielryvers.github.io/cellar-sense/) 

---

## 🛠 Scripts

| Command           | What it does                                                 |
| ----------------- | ------------------------------------------------------------ |
| `npm run dev`     | Start Vite dev server with HMR                               |
| `npm run build`   | Production build to `dist/`                                  |
| `npm run preview` | Serve built app locally                                      |
| `npm run deploy`  | Build & push `dist/` to the `gh-pages` branch (GitHub Pages) |

> `npm run deploy` requires the GitHub CLI (`gh`) and will create/force-push the `gh-pages` branch.

---

## 🚀 Deploying to GitHub Pages

1. Make sure `vite.config.js` contains
   ```js
   export default defineConfig({
     base: "/wineventory/", // <- repo name with trailing slash
   });
   ```
2. Enable Pages → _Branch: `gh-pages` / (root)_ in repo settings.
3. Run: `npm run deploy`
4. Grab a glass, your site will be live at  
   `https://<your-user>.github.io/wineventory/` in ~60 s 🍾

---

## 🔑 OpenAI Setup

1. Get an API key from https://platform.openai.com/account/api-keys
2. In the app, open **Settings → AI** and paste your key.
   - Stored in `localStorage`, never leaves the device.
3. When you add a wine, the two label images + store info are sent to OpenAI to receive structured JSON per the schema in [`copilot-instructions.md`](./copilot-instructions.md).

---

## 📄 License

MIT © Michiel Ryvers, 2025. Drink responsibly!
