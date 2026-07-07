-- 017 – Gemensam reglering: settlements-tabell.
-- Kör i Supabase SQL Editor. Idempotent.
--
-- En rad = kreditorn (till_id) har bekräftat att debitorn (fran_id) betalat
-- `belopp` i rummets optimerade betalningsplan (minimeradeOverforingar).
-- Finns raden = kvittensen finns. Ingen boolean behövs.
--
-- Nycklas på (room_id, fran_id, till_id): exakt ett par kan kvitteras en gång.
-- `belopp` sparas för staleness-koll klient-side: om planens belopp ändrats
-- (t.ex. ny utgift) räknas kvittensen inte längre som giltig.

create table if not exists settlements (
  room_id      text not null references rooms(id) on delete cascade,
  fran_id      uuid not null references members(id) on delete cascade,
  till_id      uuid not null references members(id) on delete cascade,
  belopp       numeric not null,
  kvitterad_at timestamptz not null default now(),
  primary key (room_id, fran_id, till_id)
);

create index if not exists settlements_room_id_idx on settlements(room_id);

-- ====== RLS – öppen policy (v1, matchar rooms/members/expenses) =============
alter table settlements enable row level security;

drop policy if exists "settlements open" on settlements;
create policy "settlements open" on settlements for all using (true) with check (true);
