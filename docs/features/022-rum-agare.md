# 022 – Rum-ägare

**Status:** open
**Skapad:** 2026-07-07
**Beror på:** 004a (rum-fundament), 018b (member_token / personlig länk)
**Relaterat:** 020 (ny-session/meny), 023 (intern notifiering)

## Varför

I rum-läge finns idag ingen roll-skillnad mellan deltagare — alla är jämlika
`members`. Den som skapade rummet har inget särskilt ansvar eller några
verktyg. Vi vill lägga grunden för ett **ägar-koncept**: den som skapar
rummet blir ägare och får (på sikt) administrativa förmågor.

Konkret v1-nytta: ägaren ska kunna hjälpa en deltagare tillbaka in i rummet
(genom att ta fram deltagarens personliga återanslutningslänk) samt sköta
rummet självt (byta namn, ta bort). Idag kan en deltagare som tömt sin
localStorage och inte bokmärkt sin `?me=`-länk fastna utanför — ägaren blir
då en mänsklig "reset-knapp".

## Vad

### Datamodell

Ny kolumn `owner_id uuid references members(id)` på `rooms`. Levereras som
idempotent migration (`docs/features/022-migration.sql`, samma stil som
`018b-migration.sql`).

- Sätts vid rum-skapande: i `skapaRum` (supabase.js) skapas rummet, sedan
  första medlemmen, sedan uppdateras `rooms.owner_id = medlem.id`. Returnera
  även `ownerId` från wrappern.
- Befintliga rum utan `owner_id` förblir "ägarlösa" (null) — inget problem,
  ägar-UI visas bara när `owner_id` matchar min `personId`.

### Ägarskap = mjukt/advisory (v1)

Följer nuvarande säkerhetsmodell (öppen RLS, hemligt rum-ID). Ingen
server-sida-spärr — klienten avgör om jag är ägare genom att jämföra
rummets `owner_id` mot min `personId`. Ren logik-funktion i `logic.js`:

- `arRumAgare(ownerId, personId) -> bool` (+ test).

`haRum(roomId)` returnerar redan alla kolumner via `select()`, så
`owner_id` blir tillgängligt utan ny wrapper. Vid inträde i ett rum
(`visaApp` / polling) hämtas rummets `owner_id` och `arAgare` beräknas och
lagras på klienten (t.ex. i minnet + i session-data för snabb åtkomst).

### Ägar-förmågor v1

Visas bara för ägaren, i en ny **"Ägare"-sektion** i deltagar-modalen
(`visaDeltagare`) eller i inställnings-menyn — landa placering vid
implementation, men håll det avskilt från vanliga deltagar-chips.

1. **Deltagarnas personliga länkar.** Lista varje deltagare med en
   kopiera-knapp som ger deras `?me=<member_token>`-länk (samma format som
   `gaInIRumEfterSkapa` skapar, byggd på `rumUrl`/origin). Låter ägaren
   skicka länken till någon som fastnat utanför. `hamtaDeltagare` selectar
   redan `member_token` (öppen RLS), så ingen ny query behövs — men vissa
   äldre members kan sakna token (null); visa då "ingen länk än" istället
   för en trasig länk.
2. **Byta namn på rummet.** Enkelt input + spara -> `update rooms set namn`.
   Ny tunn wrapper `bytRumNamn(roomId, nyttNamn)`. Uppdatera session-namnet
   lokalt + subtitle.
3. **Ta bort rummet.** Bekräftelse-modal (destruktivt) -> `delete rooms`
   (cascade tar members + expenses). Ny wrapper `raderaRum(roomId)`. Efter
   radering: rensa lokal session och gå till start (återanvänd
   `gaFranRumBorttaget`-liknande flöde).

### Supabase-wrappers (supabase.js)

- `skapaRum` utökas att sätta + returnera `ownerId`.
- `bytRumNamn(roomId, nyttNamn)`
- `raderaRum(roomId)`
- (`haRum`/`hamtaDeltagare` oförändrade — returnerar redan de fält vi behöver.)

### Tester

- `arRumAgare(ownerId, personId)` — true/false/null-fall.
- Supabase-wrappers är tunna och täcks av manuell verifiering (som 004a).

## Öppna frågor / noteringar

- **Placering av ägar-UI** — deltagar-modal vs. inställnings-meny. Besluta
  vid implementation; deltagar-modalen ligger närmast "vilka är med".
- **Personlig länk för äldre members utan token** — visa "ingen länk än"
  (ägaren kan inte generera token åt någon annan i v1, eftersom token
  normalt skapas klient-sida vid join). Ev. framtida: ägaren genererar och
  skriver en token åt en tokenlös medlem.
- **Ägarbyte / överlåtelse** — ingår INTE i v1. `owner_id` är fast vid
  skapande.
- **RLS-enforcement** — ingår INTE i v1 (medvetet, matchar
  security-through-obscurity). Om åtkomstmodellen skärps senare blir
  `owner_id` grunden för ägar-policies.
- **Avgränsning:** inga ägar-only-utgiftsoperationer (t.ex. "bara ägaren
  får radera andras utgifter"). v1 lägger bara grunden + de tre förmågorna
  ovan.

## När levererad

Sammanfatta vad som faktiskt byggdes och flytta filen till
`docs/features/done/`.
