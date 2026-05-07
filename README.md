# Campus Second-hand Marketplace

Campus-oriented second-hand marketplace for university students (similar to Xianyu / local classifieds).

- **Tech**: Next.js (App Router) + React + TypeScript + Tailwind CSS  
- **Backend**: Supabase **PostgreSQL + Storage** (via server-side service role where needed); **custom cookie sessions** for login (not Supabase Auth email magic links)

## Overview

Mobile-first web app for browsing and publishing listings, with optional 3D preview (Meshy), auctions, wishlist-style posts, and DM threads tied to items. A separate assistant/search API can be used by an external desktop pet client.

> **Auth**: The main feed and publish flows expect a logged-in account (`LoginScreen` → session cookie). Seed/demo cards still appear in the feed **after** login when merged with live DB rows.

## Screenshots

> TODO: add screenshots / GIFs

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Features (current)

- Login / register (username + password), HTTP-only session cookie
- **UI language**: English by default; switch to **中文** in **Settings** (`/settings`). Locale is stored in `localStorage` (`ent-locale`) and updates `document.documentElement.lang`. Root layout wraps the app with **`LocaleProvider`** (see `components/providers/`).
- Homepage: search, localized category labels, campus pickup filters, masonry / feed layouts, top tabs (recommend / discover / wishlist / auction — copy follows locale)
- **Seed demo listings** (`seed-{id}` rows merged into the feed): titles and meetup lines come from **`lib/i18n/demoListing.ts`** (EN + ZH); numeric/category data stays in **`lib/mock/items.ts`**
- Listing detail, seller profile, publish with image upload + optional **cover** selection and optional **Meshy** Image→3D
- **Auction** listings and auction detail page
- **Wishlist** forum–style posts and per-post pages
- **Direct messages**: thread per buyer/seller/item (`/chat/[id]`, demo chat route)
- Virtual assistant page (`/assistant`) with search integration
- **Desktop pet** (`components/pet/WebPet.tsx`) runs on every page and calls `POST /api/search`; it must stay **inside** `AppProviders` in `app/layout.tsx` so hooks like `useLocale()` work

## Tech Stack

- **Frontend**: Next.js App Router, React, TypeScript, Tailwind CSS  
- **Backend**:
  - **Auth**: `accounts` + `sessions` tables, bcrypt passwords, cookie session (`lib/server/session.ts`)
  - **Database**: PostgreSQL (`supabase/schema.sql` + migrations under `supabase/migrations/`)
  - **Storage**: `item-images` bucket (upload via `POST /api/upload/item-image`); listing cards use **`GET /api/items/[id]/card-image`** to redirect or stream images (works with **private** buckets when `SUPABASE_SERVICE_ROLE_KEY` is set)
  - **3D**: Meshy image→GLB pipeline (`/api/3d/generate`, `/api/3d/status`); GLB served via `/api/items/[id]/model-glb`
- **Desktop pet / avatar (optional)**: Electron, PIXI.js, pixi-live2d-display

## Folder Structure

```text
app/
  page.tsx                  # Homepage
  publish/page.tsx          # Publish listing
  register/page.tsx         # Register
  profile/page.tsx          # Profile / listings
  campus/page.tsx           # Campus helper UI
  item/[id]/page.tsx        # Listing detail
  auction/[id]/page.tsx     # Auction detail
  wish/[id]/page.tsx        # Wishlist post detail
  chat/[id]/page.tsx        # DM thread
  assistant/page.tsx        # Virtual assistant
  api/
    auth/*                  # login, logout, register, me
    items/*                 # CRUD, card-image, model-glb, bids, …
    upload/item-image       # Image upload
    3d/*                    # Meshy job create + poll
    search/route.ts         # Natural-language search
    dm/thread               # Open DM for an item
components/
  auth/LoginScreen.tsx
  home/Homepage.tsx
  navigation/BottomNav.tsx
  publish/PublishItemForm.tsx
  viewer/Item3DViewer.tsx
lib/
  i18n/                     # Locale messages, demo listing strings, format helpers
  server/session.ts         # Cookie sessions
  server/supabaseAdmin.ts   # Service-role client
  itemImages.ts             # First image helper for covers
  validation/publish-item.ts
components/providers/
  LocaleProvider.tsx        # Locale context + useLocale()
  AppProviders.tsx          # Wraps children with LocaleProvider
supabase/
  schema.sql                # Base schema (run first)
  migrations/*.sql          # accounts/sessions, auctions, 3D columns, …
docs/
  architecture.md
  supabase-connect.md
```

## Prerequisites

- Node.js 18+
- A Supabase project (Postgres + Storage)
- Git (optional)

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Environment variables

Create `.env.local` (do **not** commit it).

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
DEEPSEEK_API_KEY=your-deepseek-api-key
GEMINI_API_KEY=your-gemini-api-key
```

**Required for server APIs** (publish, feed items, image proxy, 3D):

```env
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

**Optional**:

```env
MESHY_API_KEY=your-meshy-api-key
```

### 3) Create Supabase tables + RLS

In Supabase → **SQL Editor**:

1. Run `supabase/schema.sql`  
2. Run migration files in `supabase/migrations/` in chronological order (or use Supabase CLI migrations if you use it)

### 4) Storage bucket for images

In Supabase → **Storage**:

- Create bucket: **`item-images`**
- The app upload route uses `getPublicUrl`; listing UIs load covers through **`/api/items/[id]/card-image`**, which signs or streams objects. **Private buckets are supported** as long as `SUPABASE_SERVICE_ROLE_KEY` is configured.

Adjust Storage policies to match your security model; service-role routes bypass RLS for trusted server operations.

### 5) Run the dev server

```bash
npm run dev
```

Useful routes:

- `http://localhost:3000/` — Home (after login)  
- `http://localhost:3000/publish` — Publish  
- `http://localhost:3000/register` — Register  
- `http://localhost:3000/assistant` — Assistant  

## Database Schema (summary)

Defined in `supabase/schema.sql` and migrations:

- `users` — profiles (FK targets for items, threads, etc.)
- `accounts` / `sessions` — username login + cookie sessions (see migrations)
- `items` — listings (including optional auction and 3D columns)
- `wishlist`, `favorites`, `chat_threads`, `chat_messages`, auction/bids (per migrations)

Run migrations so your DB matches the app code.

## Search API

- **`POST /api/search`** — JSON body: `{ "query": string, "locale"?: "en" | "zh" }` (locale defaults to `en`). Returns ranked **mock** items with `title` and `meetupLocation` strings **localized** to the requested locale. Scoring matches against **both** English and Chinese demo strings so queries in either language still rank results.

Example:

```bash
curl -s -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"二手 笔记本\",\"locale\":\"zh\"}"
```

## Virtual Assistant + Desktop Pet

- **`/assistant`** — browser UI for text / voice-style search.  
- Desktop pet should call **`http://localhost:3000/api/search`** (same shape as in code).

## Live2D Model Assets

Live2D is wired in the assistant area; models are not bundled by default. Copy your Live2D `public/models` tree into this repo’s `public/models` if you want the avatar to render.

## 3D Image → GLB (Meshy)

- Seller uploads photos; optional 3D uses the **first image** in `images_array` (publish flow can reorder so the cover is first).  
- Polling `/api/3d/status` until `3d_status === completed`; GLB is stored under Storage and shown with `<model-viewer />` via `/api/items/[id]/model-glb`.

Ensure DB columns from migrations exist: `3d_job_id`, `3d_status`, etc.

## Direct Messages

Schema includes `chat_threads` / `chat_messages`. The app exposes APIs to open a thread from an item; realtime subscriptions can be added later.

## Notes / Troubleshooting

1. **`Could not find the table 'public.items'`**  
   Run `schema.sql` and migrations against the correct Supabase project.

2. **Publish image upload fails**  
   Confirm bucket name is exactly `item-images` and Storage policies allow the upload path you use. Confirm `SUPABASE_SERVICE_ROLE_KEY` for server routes.

3. **Listing cover / card image broken (blank or broken icon)**  
   Covers load from `images_array[0]` via **`GET /api/items/[id]/card-image`**. For private buckets, ensure `SUPABASE_SERVICE_ROLE_KEY` is set so the route can sign or stream the file.

4. **`/assistant` Live2D empty**  
   Add model assets under `public/models` as documented above.

5. **Desktop pet search fails**  
   Next.js must be running; pet should target `/api/search`. Send `{ "query": "...", "locale": "en" | "zh" }` if you want localized titles in the response.

6. **`useLocale must be used within LocaleProvider`**  
   Any component that calls `useLocale()` must render under `<AppProviders>` / `<LocaleProvider>`. The desktop pet is rendered inside `AppProviders` in `app/layout.tsx` so it shares the same locale as the rest of the app.

7. **Secrets**  
   Never expose `SUPABASE_SERVICE_ROLE_KEY` or Meshy keys to the browser; keep them server-side only.

## Deployment

- **Vercel** (or similar): set all env vars in project settings; production should use `secure` cookies (`NODE_ENV=production`).  
- **Supabase**: align RLS and Storage policies with your deployment.

## License

MIT

## Changelog

### 2026-05-07

#### feat / i18n

- App-wide UI strings via `lib/i18n/messages.ts` + `LocaleProvider`; settings language toggle (EN / 中文).  
- Seed demo listing titles and meetup lines: `lib/i18n/demoListing.ts` with English defaults and Chinese variants; homepage and seed item detail resolve text by locale.  
- `POST /api/search` accepts optional `locale`; natural-language scoring uses bilingual haystack for mock items.

#### fix

- Render `WebPet` inside `AppProviders` so `useLocale()` does not throw at runtime.

#### docs

- Update `README.md` for i18n, demo listings, search API, and LocaleProvider troubleshooting.

### 2026-05-06

#### docs

- Refresh `README.md`: session-based auth, migrations, Meshy 3D, auctions, chat/wishlist routes, Storage + `card-image` behavior for listing covers.

### 2026-04-09

#### feat

- Add video → GLB 3D pipeline exploration with manual status refresh  
- Add Next.js API routes: `POST /api/3d/generate`, `GET /api/3d/status`  
- Add Publish flow support for optional 3D generation  
- Add in-page 3D preview using `<model-viewer />`  
- Redesign Login/Home UI toward minimalist layout  
- Add `POST /api/search` for natural-language item search  
- Add `/assistant` page with text/voice item search  
- Add Live2D display component for assistant integration  
- Connect desktop pet direction to the website search API  

#### fix

- Wrap `useSearchParams()` usage with `Suspense` to unblock `next build`  
- Load `model-viewer` client-side to avoid SSR error (`HTMLElement is not defined`)  
- Use dynamic imports for PIXI / Live2D to avoid `window is not defined` during SSR  

#### docs

- Update `README.md` with UI, assistant, desktop pet, and Live2D usage notes  
