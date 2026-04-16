# Campus Second-hand Marketplace (Next.js App Router + Supabase)

## Overview

A campus-only second-hand marketplace for university students (similar to Xianyu/Craigslist), built with:
- Next.js (App Router) + React + TypeScript
- Tailwind CSS (mobile-first)
- Supabase Auth + PostgreSQL + Storage + RLS

## Features (current)

- Minimalist Apple-style login screen, homepage, masonry feed, and floating bottom navigation
- Demo Mode: click-through access for UI/interaction testing without blocking on full auth
- Homepage: search + pill-style categories + masonry feed
- Publish Item: form validation + image upload flow (Supabase-ready)
- Search API: natural-language item lookup via `POST /api/search`
- Assistant page: virtual shopping assistant UI with text/voice search
- Desktop pet integration (via old Electron project): desktop pet can call the website search API directly
- 3D pipeline (MVP): upload a short item video → generate GLB → manual “refresh status” → in-page 3D viewer


## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Backend (Supabase):
  - Auth: email/password + email verification
  - Database: PostgreSQL (tables + RLS policies)
  - Storage: item image uploads (`item-images` bucket)
  - 3D (API): Reali3 (video → GLB)
- Desktop pet / avatar:
  - Electron
  - PIXI.js
  - pixi-live2d-display

## Folder Structure

```text
app/
  assistant/page.tsx       # Virtual assistant page
  api/search/route.ts      # Natural-language item search API
  page.tsx                  # Homepage
  publish/page.tsx         # Publish Item page
components/
  auth/LoginScreen.tsx
  assistant/AssistantPage.tsx
  assistant/AssistantPanel.tsx
  home/Homepage.tsx
  live2d/Live2DDisplay.tsx
  navigation/BottomNav.tsx
  publish/PublishItemForm.tsx
  viewer/Item3DViewer.tsx
lib/
  assistant/search.ts      # Query parsing + item ranking
  demo/demoAuth.ts         # Demo-mode local auth bypass
  mock/items.ts            # Mock data (fallback / reference)
  supabase/client.ts       # Supabase client
  supabase/studentAuth.ts  # .edu.cn student profile helpers
  validation/publish-item.ts
types/
  model-viewer.d.ts        # TS support for <model-viewer />
supabase/
  schema.sql               # DB schema + RLS policies
docs/
  architecture.md
  supabase-connect.md     # Setup guide
```

## Prerequisites

- Node.js 18+
- A Supabase project (optional for early UI demo mode)
- GitHub (optional)

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Create Supabase tables + RLS

In Supabase → `SQL Editor`, run:

- `supabase/schema.sql`

### 3) Create Storage bucket for images

In Supabase → `Storage`:
- Create a bucket: `item-images`
- Recommended: bucket is `Public` (current frontend uses `getPublicUrl`)

If needed, apply Storage policies (see `docs/supabase-connect.md`).

### 4) Add environment variables

Create a file: `.env.local` (do NOT commit it).

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
REALI3_API_KEY=your-reali3-api-key
```

### 5) Run the dev server

```bash
npm run dev
```

Open:
- Homepage: `http://localhost:3000/`
- Assistant page: `http://localhost:3000/assistant`
- Publish page: `http://localhost:3000/publish`

## Demo Mode

To keep design and interaction work moving, the app currently supports a lightweight Demo Mode:

- On the login screen, clicking the button can continue the flow even if full auth is not ready yet
- Homepage can render mock items
- Publish flow can be tested without fully blocking on production auth

This is intended for iterative UI/UX development. The strict auth/search/data flow can be re-tightened later.

## Auth Plan (Edu email required)

Current auth logic targets `.edu.cn` student emails.
After login, the app attempts to create/update a profile row in `public.users` and relies on RLS to enforce student-only access.

## Database Schema

Tables (from `supabase/schema.sql`):
- `public.users` (profiles)
- `public.items` (marketplace listings)
- `public.wishlist` (buyer requests)

RLS:
- Only authenticated users with `.edu.cn` profile rows can read/write.

## Search API

The project now includes a basic natural-language search endpoint:

- `POST /api/search`
  - Input:
    ```json
    { "query": "I want a used 13-inch laptop" }
    ```
  - Output:
    - parsed need (category / brand / size hints)
    - ranked item results

Current implementation uses mock items for quick testing. It can later be upgraded to real Supabase `items` queries.

## Virtual Assistant + Desktop Pet

There are now two assistant-related directions in the codebase:

### 1) Website assistant page

- Route: `/assistant`
- Includes:
  - text input
  - browser speech recognition
  - result cards
  - optional Live2D model area

### 2) Desktop pet integration

The intended final interaction is:
- user talks to the desktop pet
- desktop pet sends the request to the website search API
- desktop pet returns the matched items in its own bubble / UI

The Electron desktop pet code was adapted from:
- `D:\ent_coursework\nana\desktop`

Its renderer now targets:
- `http://localhost:3000/api/search`

So the desktop pet can reuse the marketplace's search capability without forcing users to open the web page.

## Live2D Model Assets

The Live2D component is wired up, but model assets are not automatically copied into this repo.

If you want the model to appear on `/assistant`, copy:

- `D:\ent_coursework\nana\frontend\public\models`

to:

- `E:\学习\ENT\public\models`

Keep the folder structure unchanged.

## 3D Video → GLB Pipeline (MVP)

This MVP supports:
- Seller uploads a short **10–15s orbit video**
- Server triggers a 3D reconstruction job (Reali3)
- User manually clicks “refresh status” until the model is ready
- App displays the model using `<model-viewer />` (touch rotate / zoom / AR)

### Required DB columns

Ensure your `items` table includes:
- `video_url`
- `3d_job_id`
- `3d_status` (`pending | processing | completed | failed`)
- `model_glb_url`

### API routes

- `POST /api/3d/generate`
  - Inputs: `multipart/form-data` with `itemId` and `video`
  - Uploads video to Supabase Storage (`item-images`)
  - Starts Reali3 job and writes `3d_job_id`, `3d_status`

- `GET /api/3d/status?itemId=...`
  - Polls Reali3 job status
  - When completed, downloads GLB, uploads to Supabase Storage, writes `model_glb_url`

## Realtime Chat (Planned)

Realtime chat is planned using:
- `chat_threads` (one thread per buyer/seller/item)
- `chat_messages` (one row per message)
- Supabase Realtime subscriptions for `chat_messages`

See `docs/architecture.md` for the recommended structure and flow.

## Notes / Troubleshooting

1. If you see: `Could not find the table 'public.items'...`
   - Ensure `supabase/schema.sql` was executed successfully in the correct Supabase project.

2. If publish image upload fails
   - Confirm the bucket name is exactly `item-images`
   - Confirm Storage policies allow authenticated insert and public select (or adjust the frontend to use signed URLs).

3. If `/assistant` page shows no Live2D model
   - Copy the old `public/models` folder into this project as described above.

4. If desktop pet search fails
   - Ensure the Next.js app is running at `http://localhost:3000`
   - Ensure the desktop pet renderer is calling `/api/search`

5. Do not commit secrets
   - `.env.local` should stay local only.
   - Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser.

## License

MIT

## Changelog

### 2026-04-09

#### feat
- Add video → GLB 3D pipeline (Reali3) with manual status refresh
- Add Next.js API routes: `POST /api/3d/generate`, `GET /api/3d/status`
- Add Publish flow support for optional 3D video upload + job creation
- Add in-page 3D preview using `<model-viewer />`
- Redesign Login/Home UI toward minimalist Apple-style layout
- Add Demo Mode for UI-first iteration without blocking on strict auth
- Add `POST /api/search` for natural-language item search
- Add `/assistant` page with text/voice item search
- Add Live2D display component for assistant integration
- Connect desktop pet direction to the website search API

#### fix
- Wrap `useSearchParams()` usage with `Suspense` to unblock `next build`
- Load `model-viewer` client-side to avoid SSR error (`HTMLElement is not defined`)
- Use dynamic imports for PIXI / Live2D to avoid `window is not defined` during SSR

#### docs
- Update `README.md` with current UI, assistant, desktop pet, and Live2D usage notes