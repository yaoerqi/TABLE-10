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

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Backend (Supabase):
  - Auth: email/password + email verification
  - Database: PostgreSQL (tables + RLS policies)
  - Storage: item image uploads (`item-images` bucket)

## Folder Structure

```text
app/
  page.tsx                  # Homepage
  publish/page.tsx         # Publish Item page
components/
  auth/AuthPanel.tsx
  home/Homepage.tsx
  publish/PublishItemForm.tsx
lib/
  mock/items.ts            # Mock data (fallback / reference)
  supabase/client.ts       # Supabase client
  validation/publish-item.ts
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
```

### 5) Run the dev server

```bash
npm run dev
```

Open:
- Homepage: `http://localhost:3000/`
- Publish page: `http://localhost:3000/publish`

## Auth Plan (Edu email required)

Current UI uses Supabase Auth and checks the signed-in user's email ends with `.edu`.
After login, the app attempts to create/update a profile row in `public.users` and relies on RLS to enforce student-only access.

## Database Schema

Tables (from `supabase/schema.sql`):
- `public.users` (profiles)
- `public.items` (marketplace listings)
- `public.wishlist` (buyer requests)

RLS:
- Only authenticated users with `.edu` profile rows can read/write.

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

## License

MIT