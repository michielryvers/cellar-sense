## 🏗️ Architecture Overview

- **Frontend (PWA):**
  - Vue 3 app, IndexedDB for offline storage.
  - Background sync logic (Service Worker or app logic).
  - Auth UI (Google OAuth via Cloudflare Worker).
- **Cloudflare Workers (API):**
  - REST endpoints for CRUD on wines, protected by Google OAuth.
  - Calls OpenAI API securely (no client-side secrets).
  - Handles sync logic (push/pull diffs).
- **Cloudflare D1:**
  - Stores wine metadata, linked to user IDs.
- **Cloudflare S2:**
  - Stores wine label images (front/back), referenced by D1.
- **Sync:**
  - Client tracks local changes (add/update/delete).
  - On reconnect, pushes changes to Worker API, pulls remote changes.
- **Auth:**
  - Google OAuth handled by Worker, issues JWT/session for client.

---

## 📁 Project Structure (Monorepo Example)

```
cellar-sense/
├── src/                # Vue 3 PWA
│   ├── db/             # IndexedDB logic
│   ├── sync/           # Sync logic (client <-> Worker)
│   ├── api/            # API client for Worker endpoints
│   └── ...
├── worker/             # Cloudflare Worker (TypeScript)
│   ├── routes/         # /wines, /images, /auth, /openai
│   ├── db/             # D1 schema & helpers
│   └── ...
├── shared/             # Shared types, schema, utils
├── package.json
└── ...
```

---

## 🧩 Key Code Concepts

### 1. **Shared Types (for both frontend & Worker)**

```typescript
export interface Wine {
  id: string;
  userId: string;
  // ...rest of schema...
  images: {
    front: string; // S2 blob key
    back: string;
  };
  updatedAt: number;
  deleted?: boolean;
}
```

---

### 2. **Cloudflare Worker API Example (D1 + S2 + OpenAI)**

```typescript
import { getUserIdFromAuth } from "./auth";
import { D1Database } from "@cloudflare/workers-types";

export async function onRequestPost(context) {
  const userId = await getUserIdFromAuth(context.request);
  const wine = await context.request.json();
  // Save wine to D1, images to S2 if present
  // Return updated wine with S2 keys
}
```

---

### 3. **Google OAuth in Worker**

- Use [Cloudflare OAuth examples](https://developers.cloudflare.com/workers/examples/oauth-google/) to implement `/auth/login` and `/auth/callback`.
- Issue a JWT or session cookie for the client.

---

### 4. **Sync Logic (Client Side)**

- Track local changes with a `pendingSync` flag or a local queue.
- On network available, POST changes to `/wines/sync`.
- Pull remote changes (since last sync timestamp).

```typescript
export async function syncWithCloud() {
  // 1. Get local changes from IndexedDB
  // 2. POST to /api/wines/sync
  // 3. Merge remote changes into IndexedDB
}
```

---

### 5. **Image Upload (Client → Worker → S2)**

- Client sends image as Blob/Base64 to Worker.
- Worker uploads to S2, stores S2 key in D1.

---

### 6. **OpenAI Integration (Worker)**

- Worker endpoint `/openai/fill-metadata` accepts image(s), calls OpenAI, returns metadata.

---

## 🏁 Can All Code Live Here?

**Yes!**

- Use a monorepo with src for frontend and `worker/` for Cloudflare Worker.
- Share types and schema in a `shared/` folder.
- Use Vite for frontend, Wrangler for Worker.
- Deploy frontend to GitHub Pages, Worker to Cloudflare.

---

## 📝 Next Steps

1. Scaffold `worker/` with Wrangler (`npx wrangler init`).
2. Move shared types to `shared/`.
3. Implement `/auth`, `/wines`, `/images`, `/openai` endpoints in Worker.
4. Add sync logic to PWA.
5. Use Google OAuth in Worker, store user ID with each wine.
