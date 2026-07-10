# 028 – Byt "rum" mot "grupp" i hela appen

**Status:** open
**Skapad:** 2026-07-07

## Varför

Ordet "rum" hängde med från Supabase-konceptet (`rooms`) och läckte ut i UI:t.
För användaren är det en **grupp** människor som delar utgifter, inte ett "rum".
"Grupp" är tydligare och mer vardagligt. Vi vill byta genomgående — i UI-text,
i koden och i databasen — så att begreppet är konsekvent.

## Vad

Genomför en genomgående namnändring från *rum* → *grupp* i tre lager:

### 1. UI-texter (index.html + app.js)

Alla synliga strängar som säger "rum", "rummet", "Skapa rum", "Gå med i rummet"
osv. byts till grupp-varianten. Exempel:

- "Skapa rum" → "Skapa grupp"
- "Rummet finns inte längre" → "Gruppen finns inte längre"
- Bekräftelse-, återställnings- och inbjudningstexter som nämner "rummet"
- README.md:s beskrivning av läget

### 2. JS-symboler (app.js, supabase.js, logic.js)

Döp om funktioner och variabler så koden matchar begreppet. Bör göras med
"rename symbol" så alla anrop följer med. Exempel på berörda namn:

- `skapaRum`, `haRum`, `gaMedIRum`, `laggTillUtgiftRum`, `raderaUtgiftRum`
- `skapaRumSession`, `skapaRumFranMeny`, `avbrytSkapaRum`, `visaSkapaRum`,
  `uppdateraRumHeader`, `aktivRumData`
- `_rumForJoin`, `_joinRumForAterstall`, `_rumSkapat`, `_skapaRumRetur`
- `parseRumSokvag`, `roomMemberKey`
- Interna kommentarer som refererar till "rum"

Behåll svenska konventionen (`grupp`, `gruppen`, `skapaGrupp` osv.).

### 3. Databas + URL (Supabase)

- Tabell `rooms` → `groups` (eller behåll tabellnamn men byt i klienten via
  vy/alias — se öppna frågor).
- Kolumn `room_id` → `group_id` i `members`, `expenses`, `settlements` och ev.
  andra tabeller som refererar rummet.
- URL-sökväg `/r/<id>` → `/g/<id>`. **Gamla `/r/`-länkar måste fortsätta funka**
  (redan utdelade inbjudningslänkar) — `parseGruppSokvag` bör acceptera både
  `/g/` och `/r/`.
- Migration skrivs som `docs/features/028-migration.sql` (följer mönstret från
  017/018b). `vercel.json`-rewrites uppdateras om `/r/`-pathen hanteras där.

## Öppna frågor / noteringar

- **DB-rename kontra alias:** Att döpa om tabeller/kolumner i Supabase kräver
  migration och att RLS-policies/foreign keys hänger med. Alternativ: behåll
  fysiska tabellnamnen (`rooms`, `room_id`) och byt bara i klientlagret. Billigare
  men lämnar "rum" kvar i DB. Rekommendation: byt även i DB för konsekvens, men
  det avgör hur stor migrationen blir.
- **Bakåtkompatibilitet för länkar:** `/r/<id>` måste leva kvar. Testa att en
  gammal inbjudningslänk fortfarande hittar gruppen.
- **localStorage-nycklar:** `roomMemberKey` bygger nycklar som redan finns på
  användares enheter. Om nyckel-prefixet byts måste befintliga nycklar migreras
  (jfr feature 003), annars tappar folk sin identitet. Enklast: behåll nyckel-
  formatet oförändrat även om funktionen döps om.
- **Avgränsning:** Ingen funktionsändring — enbart namnbyte. Beteendet ska vara
  identiskt före/efter.

## När levererad

Lägg till en kort sammanfattning av vad som faktiskt byggdes (kan skilja från
ursprunglig spec) och flytta filen till `docs/features/done/`.
