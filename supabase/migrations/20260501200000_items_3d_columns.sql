-- 3D pipeline columns for items (Meshy job id + status + GLB URL)
-- Run in Supabase SQL Editor if your live DB predates these fields.

alter table public.items
  add column if not exists "3d_job_id" text;

alter table public.items
  add column if not exists "3d_status" text;

alter table public.items
  add column if not exists model_glb_url text;
