# CellarSense – Copilot Instructions 🍷🤖

A mobile-first Progressive Web App that lets wine lovers catalogue their cellar completely offline.  
Users snap both label sides, optional store info, and let OpenAI ✨ pre-fill all metadata.

---

## 🖼 Project Snapshot

| Goal             | Status |
| ---------------- | ------ |
| Tailwind CSS UI  | ✅     |
| OpenAI auto-fill | ✅     |

---

## 🛠 Tech Stack

| Layer     | Tool / Library                       |
| --------- | ------------------------------------ |
| Framework | Vue 3 (`<script setup>`)             |
| Build     | Vite                                 |
| Styling   | Tailwind CSS                         |
| PWA       | vite-plugin-pwa (Workbox)            |
| Storage   | IndexedDB via `idb`                  |
| AI (opt)  | OpenAI API (client-side fetch)       |
| Tooling   | TypeScript, ESLint, Prettier, Vitest |
| Deploy    | GitHub Pages                         |

---

## 📐 Data Schema

```json
{
  "name": "Raide Wine",
  "vintner": "Les Vignerons d’Estézargues",
  "vintage": 2023,
  "appellation": "Côtes du Rhône Villages AOP",
  "region": "Rhône Valley, France",
  "grapes": {
    "Grenache": 60,
    "Syrah": 25,
    "Mourvèdre": 10,
    "Carignan": 5
  },
  "color": "Red",
  "volume": "750 ml",
  "alcohol": "14% Vol",
  "farming": "Organic",
  "vinification": {
    "harvest": "Manual",
    "yeasts": "Indigenous",
    "maceration": "3 weeks in vats at low temperature",
    "aging": "9 months in vats",
    "bottling": "Unfined, unfiltered, micro-dose of sulfur"
  },
  "tasting_notes": {
    "nose": ["Raspberry", "Blackcurrant", "Flowers", "Herbs", "Mint"],
    "palate": [
      "Structured",
      "Present tannins",
      "Mouthfilling",
      "Raspberry jam finish"
    ]
  },
  "drink_from": 2025,
  "drink_until": 2026,
  "price": "€10.50",
  "sulfites": "Low-sulfite",
  "images": {
    "front": "blob-url-or-base64",
    "back": "blob-url-or-base64"
  }
}
```

---

## 🗺 Feature Roadmap (one commit each)

1. Local storage layer (IndexedDB wrapper + wine model) ✅
2. Add-wine form (front/back image, store field) with preview ✅
3. OpenAI integration to populate metadata ✅
4. Wine list view with filters (color, vintage, name) 🕒
5. Detailed wine modal/page ✅
6. Mark wine as “drunk” (archive) ✅
7. JSON backup & restore (optional) ✅

---

## 🧭 General Guidelines for Copilot

- Ship **one well-defined feature per commit** – keep history clean.
- Keep dependency footprint tiny; prefer browser-native APIs.
- Default to offline-first logic.
- Stick to the schema above; evolve only via explicit PRs.
- Write concise, self-documenting code; comments only where
