# 022 – Rum-ägare

**Status:** splittrad
**Skapad:** 2026-07-07
**Uppdaterad:** 2026-07-17
**Beror på:** 004a (rum-fundament), 018b (member_token / personlig länk)
**Relaterat:** 020 (ny-session/meny), 023 (intern notifiering)
**Delar:** [022a – Rum-ägare: grund och återanslutningslänkar](022a-rum-agare-grund.md), [022b – Rum-ägare: administrera grupp](022b-rum-agare-admin.md)

## Varför

I grupp-läge finns idag ingen roll-skillnad mellan deltagare — alla är jämlika
`members`. Den som skapade gruppen har inget särskilt ansvar eller några
verktyg. Vi vill lägga grunden för ett **ägar-koncept**: den som skapar
gruppen blir ägare och får administrativa förmågor.

Konkret nytta:

- Ägaren kan hjälpa en deltagare tillbaka in i gruppen genom att ta fram
  deltagarens personliga `?me=`-återanslutningslänk.
- Ägaren kan senare sköta gruppen själv: byta namn och ta bort gruppen.

## Findings från genomgång 2026-07-17

Feature 022 är större än en enkel UI-ändring men mindre än ett stort ombygge.
Den bör delas i två leveranser för att minska risk.

**022a, ägargrund + personliga länkar:** ca 2–3 timmar.

Berör:

- `docs/features/022-migration.sql` — ny idempotent migration för `rooms.owner_id`.
- `supabase.js` — `skapaGrupp` sätter och returnerar `ownerId`.
- `logic.js` + `logic.test.js` — ren funktion `arRumAgare(ownerId, personId)`.
- `app.js` — sessiondata behöver bära `ownerId`; gruppdata behöver uppdateras vid
  inträde/polling; deltagarmodalen får en ägarsektion med personliga länkar.
- `index.html` — markup/stil för ägarsektionen i deltagarmodalen.
- `sw.js` — cache-bump eftersom app-skalet ändras.

**022b, administrera grupp:** ca 3–5 timmar.

Berör:

- `supabase.js` — nya wrappers för namnbyte och radering.
- `app.js` — UI-flöden för namnbyte/radering, lokal sessionssynk, headeruppdatering
  och återgång efter radering.
- `index.html` — input/knappar/bekräftelse för administrativt UI.
- `sw.js` — cache-bump.

Största risken ligger i `app.js`: ägar-state måste följa session, polling,
återanslutning och borttagen-grupp-flödet utan att ge fel UI till äldre,
ägarlösa grupper. Datamodell och Supabase-wrappers är relativt tunna.

## Avgränsning

Ägarskap är **mjukt/advisory** i v1. Det följer nuvarande säkerhetsmodell
(öppen RLS, hemligt grupp-ID). Klienten avgör om jag är ägare genom att jämföra
`rooms.owner_id` med min `personId`.

Ingår inte:

- server-side enforcement/RLS-policies för ägare
- ägarbyte/överlåtelse
- ägar-only-utgiftsoperationer, t.ex. att bara ägaren får radera andras utgifter
- generera token åt äldre tokenlösa medlemmar

## Leveransordning

1. Implementera 022a först och flytta den specen till `docs/features/done/`.
2. Implementera 022b efter att 022a ligger i produktion och ägar-state är stabilt.

När båda är levererade kan denna översikt flyttas till `docs/features/done/`
eller lämnas kvar som historisk parent beroende på hur features-listan känns då.
