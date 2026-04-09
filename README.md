# Campus Second-hand Marketplace (Next.js App Router + Supabase)

## Overview

A campus-only second-hand marketplace for university students (similar to Xianyu/Craigslist), built with:
- Next.js (App Router) + React + TypeScript
- Tailwind CSS (mobile-first)
- Supabase Auth + PostgreSQL + Storage + RLS

## Features (current)

- Student-only access plan (Edu email required)
- Homepage: browse items with search + category filter (real Supabase data)
- Publish Item: create listings and upload item images to Supabase Storage
- 3D pipeline (MVP): upload a short item video → generate GLB → manual “refresh status” → in-page 3D viewer


## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Backend (Supabase):
  - Auth: email/password + email verification
  - Database: PostgreSQL (tables + RLS policies)
  - Storage: item image uploads (`item-images` bucket)
  - 3D (API): Reali3 (video → GLB)

## Folder Structure

```text
app/
  page.tsx                  # Homepage
  publish/page.tsx         # Publish Item page
components/
  auth/LoginScreen.tsx
  home/Homepage.tsx
  publish/PublishItemForm.tsx
  viewer/Item3DViewer.tsx
lib/
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
- A Supabase project
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
- Publish page: `http://localhost:3000/publish`

## Auth Plan (Edu email required)

Current UI uses Supabase Auth and checks the signed-in user's email ends with `.edu.cn`.
After login, the app attempts to create/update a profile row in `public.users` and relies on RLS to enforce student-only access.

## Database Schema

Tables (from `supabase/schema.sql`):
- `public.users` (profiles)
- `public.items` (marketplace listings)
- `public.wishlist` (buyer requests)

RLS:
- Only authenticated users with `.edu` profile rows can read/write.

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

3. Do not commit secrets
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

#### fix
- Wrap `useSearchParams()` usage with `Suspense` to unblock `next build`
- Load `model-viewer` client-side to avoid SSR error (`HTMLElement is not defined`)

#### docs
- Update `README.md` with 3D pipeline setup, env vars, and API route usage