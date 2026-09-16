-- 037 – Lägg till lamnad på members (soft-leave).
-- Kör i Supabase SQL Editor. Idempotent.

alter table members
  add column if not exists lamnad boolean not null default false;
