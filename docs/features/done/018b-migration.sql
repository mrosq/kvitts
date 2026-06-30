-- 018b – Lägg till identitet_hash och member_token på members.
-- Kör i Supabase SQL Editor. Idempotent.

alter table members
  add column if not exists identitet_hash text,
  add column if not exists member_token   text unique;

create index if not exists members_identitet_hash_idx on members(identitet_hash);
create index if not exists members_member_token_idx   on members(member_token);
