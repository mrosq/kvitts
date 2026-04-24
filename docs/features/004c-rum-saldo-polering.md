# 004c – Rum: saldo-vy för N + polering

**Status:** open
**Skapad:** 2026-04-24
**Del av:** 004 (multi-user-rum via delad länk), tredje och sista steget.
**Beror på:** 004b (utgifter + polling)

## Varför

Efter 004b fungerar rum med utgifter, men saldo-visningen och kanterna
runt rum-läget saknar polering. 004c färdigställer N-personers saldo-vy
och ser till att rum-upplevelsen känns klar (felhantering, dolda
irrelevanta kontroller, edge cases).

## Vad

### Saldo-vy i rum

Använd befintlig `raknaParSaldon(utgifter, migId, personer)` (logic.js) —
redan N-generaliserad sedan 006c. Rendera som lista:

- "Anna är skyldig dig 240 kr"
- "Du är skyldig Erik 80 kr"
- ... en rad per relation där nettot ≠ 0

Noll-saldon döljs eller visas diskret. "Settle up"-algoritm som
minimerar antal transaktioner ingår **inte** i v1 (enligt 004-spec).

### Reglera i rum

Samma knapp och beteende som i single-user-läget: en "Reglera"-knapp
arkiverar rummet **för den inloggade personen**. Arkiveringen är lokal —
den påverkar inte andra deltagares vy av rummet. Rummet i sig (på backend)
fortsätter existera tills alla har reglerat eller tills det raderas.

Varje deltagare ser alltså rummet som aktivt tills de själva tryckt
"Reglera". Ingen kan reglera åt någon annan i denna version.

Mer avancerad gemensam reglering (kreditor bekräftar per debitor etc.)
hanteras i feature 017.

### Dölj irrelevanta kontroller i rum-läge

- **Spara/ladda-fil** (feature 000): dölj i rum-läget. Backend är
  persistensen; fil-export ger föga mening här.
- Andra lokal-specifika kontroller som inte passar i rum granskas vid
  implementation.

### Felhantering

- **Offline-banner:** När Supabase-anrop misslyckas (nät, 5xx, etc.) —
  visa banner ("Ingen anslutning — ändringar sparas inte"). Mönstret följer
  reglerad-banner från feature 001 (app.js).
- **Read-only tills anslutning tillbaka:** Inputs disablas så att man inte
  råkar skriva mot backend som inte svarar.
- **Raderat rum** (404 från backend): visa "Rummet finns inte längre" och
  ta användaren tillbaka till menyn.

### Edge cases

- Dubbel-join med samma `person_id` (samma enhet, dubbel-klickar länken)
  — idempotent.
- Deltagare som bytt namn — stödjs inte i v1 (namn är immutable efter join).
- Rum-ID som inte matchar pathname-regex — 404-skärm.

## Öppna frågor / noteringar

- **PWA-koordination:** Rum-läget är online-only, vilket gör
  PWA-installations-prompten relevantare. Feature 015 (PWA) finns redan
  speccad. Överväg att leverera 015 parallellt eller direkt efter 004c.
- **Avgränsning:** Ingen "settle up"-algoritm i v1.
- **Avgränsning:** Inget stöd för att ta bort deltagare eller radera rum.
- **Avgränsning:** Ingen konvertering av lokal session till rum
  (enligt 004-spec, sparas till v2).
- **Avgränsning:** Inga notifikationer när någon lägger till utgift.

## När levererad

Lägg till en kort sammanfattning och flytta filen till `docs/features/done/`.
När alla tre (004a/b/c) är i `done/` kan översiktsspecen 004 också flyttas dit.
