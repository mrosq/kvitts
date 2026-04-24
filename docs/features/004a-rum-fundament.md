# 004a – Rum-fundament: Supabase, routing, skapa/gå med

**Status:** open
**Skapad:** 2026-04-24
**Del av:** 004 (multi-user-rum via delad länk), första steget.

## Varför

Fyll val B i intro-flödet (idag "kommer snart", skärm 3b) med faktisk
funktionalitet: en användare kan skapa ett rum, dela en länk, och en annan
användare kan gå med via länken. Inga utgifter än — detta är infrastruktur
(backend, routing, onboarding) som 004b/c bygger på.

Se 004-specen för helhetskontext: persondesign, RLS-modell, "vem som helst
med länken kommer in".

## Vad

### Supabase-setup

Manuellt steg för utvecklaren vid implementation:

1. Skapa projekt på supabase.com.
2. Kör SQL som levereras med denna feature (`docs/features/004-supabase-setup.sql`)
   för att skapa `rooms`, `members`, `expenses` enligt 004-specens tabell.
3. RLS lämnas öppen i v1 (spec tillåter).
4. Kopiera `URL` + `anon key` till klient-config (se nedan).

### Config-mekanism

**Beslut att ta vid implementation:** var lagras `SUPABASE_URL` och
`SUPABASE_ANON_KEY`?

- **Alt A – hårdkodad `config.js`:** Enkelt, ingen byggsteg. Behåller
  `file://`-öppning (utan rum-funktion). Anon-nyckeln är public-by-design.
- **Alt B – env-injection vid Vercel-build:** Bryter `file://`-principen
  i CLAUDE.md.

Välj medvetet och notera valet i CLAUDE.md.

### Supabase-klient (klient-sida)

Ladda `@supabase/supabase-js` via CDN `<script>` i `index.html` (no-build).
Wrappa i ny fil `supabase.js` med tunna funktioner:

- `skapaRum(namn, minNamn) → {roomId, personId}`
- `haRum(id) → room | null`
- `gaMedIRum(id, namn) → {roomId, personId}`
- `hamtaDeltagare(roomId) → members[]`

### URL-routing

I `init()` (app.js), läs `window.location.pathname`:

- `/` → vanliga flödet (oförändrat)
- `/r/<id>` → hoppa över session-auto-restore, gå direkt till join-flödet
  för det rummet

Ny `vercel.json` med rewrite `/r/:id` → `/index.html` så SPA-routing
fungerar deployat.

### UI

- **Skärm 3b** (`intro-3b`): ersätt "kommer snart" med två knappar:
  - "Skapa nytt rum" → skapa-rum-skärm
  - "Gå med i rum" → fråga efter kod/länk, gå vidare till join-skärm
- **Skapa-rum-skärm:** input för projektnamn (max 40 tecken) → POST till
  Supabase → visa delbar URL med kopiera-knapp + Web Share API om
  tillgängligt. "Klar"-knapp går in i rummet.
- **Gå-med-skärm:**
  - Om användaren har `kvitts_person1` → "Du heter X — gå med i
    'Spanien 2026'?"
  - Annars fråga efter namn först.
  - POST member till Supabase, generera `person_id` (UUID), spara i
    session-data.

### Rum som session-typ

Bygg på multi-session (feature 001) istället för att skapa ett parallellt
rum-läge:

- `skapaSession` utökas med `kind` (default `"lokal"`, eller `"rum"`).
- Rum-sessioner har extra fält i sin session-data:
  `{personer, migId, utgifter, kind: "rum", roomId, personId}`.
- `person_id` lagras inuti session-dataobjektet (inget nytt top-level-
  prefix).
- Menyn (feature 009) markerar rum-sessioner med ikon/etikett.

### Tester

- `parseRumSokvag("/r/ABC123") === "ABC123"` och varianter.
- Supabase-anropen är tunna wrappers — täcks av manuell verifiering, inte
  mockade i v1.

## Öppna frågor / noteringar

- **Config-mekanism** (Alt A vs B) — besluta vid implementation.
- **Rum-ID-format** — 6–8 alphanumeriska tecken enligt spec (`K7M2X9`).
  Genereras klient-sida eller i Supabase? Besluta vid implementation.
- **Avgränsning:** Ingen utgifts-CRUD i 004a. Rummet finns, deltagare
  finns, men historik/saldo visar tom lista. Det är 004b.
- **Avgränsning:** Ingen polling i 004a. Deltagar-listan kan vara stale
  tills 004b.

## När levererad

Lägg till en kort sammanfattning och flytta filen till `docs/features/done/`.
