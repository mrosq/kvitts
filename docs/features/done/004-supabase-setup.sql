-- Kvitts 004 – Supabase-schema för multi-user-rum.
-- Kör hela filen i SQL Editor när Supabase-projektet är nyskapat.
-- Idempotent: kan köras igen utan att förstöra data (CREATE IF NOT EXISTS).
--
-- Designval (se docs/features/004-multi-user-rum.md):
-- - Öppen RLS i v1: vem som helst med rum-ID kan läsa/skriva i det rummet.
--   Säkerheten ligger i att rum-ID:t är hemligt nog (6 tecken alphanumeriska).
-- - Rum-ID genereras serversidan via default på kolumnen → klienten skickar
--   bara namn + skapare, får tillbaka det genererade ID:t.

-- ====== Rum-ID-generator ===================================================
-- Genererar ett 6-teckens alphanumeriskt ID. Versaler + siffror, inga
-- förväxlingsbara tecken (ingen 0/O eller 1/I/l) för enklare delning.
create or replace function generate_room_id() returns text as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- ====== rooms ==============================================================
create table if not exists rooms (
  id text primary key default generate_room_id(),
  namn text not null,
  skapad timestamptz not null default now()
);

-- ====== members ============================================================
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  namn text not null,
  joined_at timestamptz not null default now()
);

create index if not exists members_room_id_idx on members(room_id);

-- ====== expenses ===========================================================
-- Skapas redan här så 004b inte behöver migrationer. Polling i 004b läser
-- denna tabell men för 004a räcker det att den finns.
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  beskrivning text not null,
  belopp numeric not null,
  betalare_id uuid not null references members(id),
  fordelning jsonb not null,
  datum date not null,
  lagd_till_av_id uuid not null references members(id),
  skapad timestamptz not null default now()
);

create index if not exists expenses_room_id_idx on expenses(room_id);

-- ====== RLS – öppna policies (v1) ==========================================
-- "Vem som helst med rum-ID kommer in." Vi gör allt-läsbart och
-- allt-skrivbart för den publicerbara nyckeln. Detta matchar designen.
-- Skärps i en framtida version om åtkomst-modellen ändras.

alter table rooms enable row level security;
alter table members enable row level security;
alter table expenses enable row level security;

drop policy if exists "rooms open" on rooms;
create policy "rooms open" on rooms for all using (true) with check (true);

drop policy if exists "members open" on members;
create policy "members open" on members for all using (true) with check (true);

drop policy if exists "expenses open" on expenses;
create policy "expenses open" on expenses for all using (true) with check (true);
