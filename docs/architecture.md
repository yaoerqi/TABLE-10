# Campus Marketplace Architecture (Next.js + Supabase)

## 1) Initial Project Folder Structure

```text
.
├─ app/
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ page.tsx                    # Homepage (search + filters + masonry)
│  └─ publish/
│     └─ page.tsx                 # Publish item page
├─ components/
│  ├─ home/
│  │  └─ Homepage.tsx
│  └─ publish/
│     └─ PublishItemForm.tsx
├─ lib/
│  ├─ mock/
│  │  └─ items.ts
│  └─ validation/
│     └─ publish-item.ts
├─ supabase/
│  └─ schema.sql                  # Tables + RLS policies
├─ docs/
│  └─ architecture.md
├─ package.json
├─ next.config.ts
├─ tailwind.config.ts
└─ tsconfig.json
```

## 2) High-Level Architecture

- **Frontend (Next.js App Router)**
  - `app/page.tsx`: public browsing experience with search/filter and item feed.
  - `app/publish/page.tsx`: form workflow for creating listings.
  - Components are separated by feature (`home`, `publish`) for easy scaling.

- **Backend/Data (Supabase)**
  - Supabase Auth handles registration/login/session.
  - PostgreSQL stores `users`, `items`, `wishlist`.
  - RLS policies enforce that only authenticated `.edu` users can access data.

- **Media**
  - Item images should be uploaded to Supabase Storage bucket (e.g., `item-images`).
  - `items.images_array` stores image URLs.

## 3) Authentication Plan (Edu Email Required)

1. **Sign up with Supabase Auth email/password**.
2. **Restrict email domain in app layer**:
   - During signup, only allow addresses matching `*.edu`.
3. **Email verification required**:
   - Supabase sends confirmation mail; unverified users cannot continue.
4. **Create profile row in `public.users` after auth success**:
   - Store `edu_email`, `nickname`, avatar, dorm area.
5. **RLS hardening**:
   - Policies also require an authenticated user with a `.edu` email profile row.

## 4) Product Listing Data Model

- **users**
  - 1:1 with `auth.users`.
  - Holds campus identity metadata.

- **items**
  - Linked by `seller_id -> users.id`.
  - Supports marketplace browsing (`status`, `category`, `price`, images, meetup place).

- **wishlist**
  - Linked by `buyer_id -> users.id`.
  - Captures "want to buy" demand and budgets.

## 5) Real-Time Chat Structure (Recommended)

To support negotiation between buyer and seller:

- **chat_threads**
  - `id`, `item_id`, `buyer_id`, `seller_id`, `created_at`
  - Unique constraint on (`item_id`, `buyer_id`, `seller_id`) to avoid duplicate threads.

- **chat_messages**
  - `id`, `thread_id`, `sender_id`, `content`, `created_at`, `is_read`

- **Real-time delivery**
  - Use Supabase Realtime subscriptions on `chat_messages` filtered by `thread_id`.
  - UI flow:
    1) Buyer opens item and starts chat.
    2) Create/get thread.
    3) Subscribe to new messages in thread.
    4) Insert message rows; both sides receive updates instantly.

- **RLS**
  - Only thread participants (`buyer_id` or `seller_id`) can read/write messages.

## 6) Suggested Next Steps

1. Wire `PublishItemForm` submission to Supabase inserts.
2. Add Supabase Storage upload and persist URLs in `images_array`.
3. Replace mock homepage items with real query from `items`.
4. Add authentication pages (`/login`, `/signup`) with `.edu` domain validation.
