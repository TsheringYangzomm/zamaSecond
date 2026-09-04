-- =========================================================
-- Zama dietitian / dietician profiles
--
-- A dedicated profile table for the site's dietician(s):
-- name, professional title, portrait image, biography, and
-- study / qualifications. Published profiles appear on the
-- meal-kit trust page and the home meal-kit section banner.
--
-- Multiple profiles are supported and ordered by sort_order.
-- Run after supabase/cms-schema.sql (for public.is_admin()
-- and storage bucket policies). Run manually in the Supabase
-- SQL Editor.
-- =========================================================

create table if not exists public.dieticians (
  id text primary key,
  name text not null default '',
  title text not null default '',
  image text not null default '',
  bio text not null default '',
  qualifications text not null default '',
  consultant_note text not null default '',
  dietician_note text not null default '',
  meal_kit_notes jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dieticians enable row level security;

drop policy if exists "dieticians public read" on public.dieticians;
create policy "dieticians public read" on public.dieticians
  for select using (published = true or public.is_admin());

drop policy if exists "dieticians admin write" on public.dieticians;
create policy "dieticians admin write" on public.dieticians
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists set_updated_at on public.dieticians;
create trigger set_updated_at before update on public.dieticians
  for each row execute function public.set_updated_at();

-- Dietician portraits are stored in the shared public "catalog"
-- bucket under the "dieticians/{id}/" folder. No new bucket is
-- needed; the catalog bucket policies already cover this folder.

-- =========================================================
-- Per-dietician meal-kit notes.
-- Each dietician stores an array of notes they wrote for
-- specific meal kits:
--   [{"productId": "...", "consultantNote": "...", "dieticianNote": "..."}]
-- Idempotent: safe to run even if the table already exists
-- without these columns (from the earlier dietician migration).
-- =========================================================

alter table public.dieticians
  add column if not exists consultant_note text not null default '';

alter table public.dieticians
  add column if not exists dietician_note text not null default '';

alter table public.dieticians
  add column if not exists meal_kit_notes jsonb not null default '[]'::jsonb;
