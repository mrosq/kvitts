# 026 – Konton: en användare unik i hela Kvitts (grund, utan auth)

**Status:** open
**Skapad:** 2026-07-07
**Beror på:** 018b (identitets-hash + token), 025 (dedupe per rum)

## Varför

Kvitts har idag ingen global användare — bara medlemskap per rum. Vi vill
införa ett **konto-lager**: en användare är unik i hela Kvitts (identifierad
via e-post). Detta är grunden för att på sikt kunna:

- reglera skulder mellan **samma personer över flera rum**,
- visa "mina rum" samlat oavsett enhet,
- senare koppla på riktig auth (lösenord/OTP) utan att strukturera om.

**Ingen auth i v1.** E-post *är* inloggningen — anger du din e-post är du den
användaren (samma trust-nivå som appen redan har). Auth kan läggas på senare
mot samma tabell.

## Vad

### Ny tabell `identiteter` (global användare)

```sql
create table if not exists identiteter (
  id             uuid primary key default gen_random_uuid(),
  identitet_hash text unique not null,   -- SHA-256 av normaliserad e-post
  member_token   text unique,            -- global personlig återkomst-token
  skapad         timestamptz not null default now()
);

alter table members
  add column if not exists identitet_id uuid references identiteter(id);
```

- **Global unikhet** = `unique(identitet_hash)`. En e-post → en användare.
- Fortsatt **endast hash** i DB, aldrig klartext (som 018b).
- `members.identitet_id` binder varje medlemskap till en global användare.

### Logik: hitta-eller-skapa användare

En hjälpare `KvittsSupabase.hittaEllerSkapaIdentitet(hash)` →
`{ identitetId, redanFanns }`:

- Slå upp hashen. Finns → returnera. Finns inte → `insert` och returnera.

Vid join/skapa-rum (efter 025:s dedupe): koppla medlemmen till
`identitet_id`. På så vis vet appen att "Anna i rum A" och "Anna i rum B" är
samma användare.

### Migration

Idempotent `docs/features/026-migration.sql`:

- Skapa `identiteter` + kolumn `members.identitet_id`.
- Backfill: en `identiteter`-rad per unik `identitet_hash` i `members`, koppla
  medlemmarna.
- Öppen RLS-policy på `identiteter` (samma linje som övriga tabeller i v1).

## Avgränsning (vad som INTE ingår i v1)

- Ingen faktisk cross-room-reglering / aggregerat saldo — det är en egen
  feature som *bygger på* denna. Här läggs bara datagrunden + koppling.
- Ingen inloggningsskärm, lösenord eller OTP.
- Ingen sammanslagning av två separata konton (om någon använt två adresser).
- Global `member_token`-uppslag (token → alla mina rum) kan komma senare.

## Öppna frågor / noteringar

- Behåller vi `members.identitet_hash` bakåtkompatibelt eller migrerar helt
  till `identiteter`? Förslag: behåll under övergång, låt `identitet_id` bli
  sanningen.
- Account enumeration (går att se om en e-post finns) accepteras i v1 —
  låg risk för en utgiftsapp, mitigeras av framtida auth.

## När levererad

*(Fylls i efter leverans.)*
