# 014 – Historik: detaljvy istället för edit-modal

**Status:** done
**Skapad:** 2026-04-21
**Levererad:** 2026-04-24

## Vad byggdes

- Historik-kortet: `fordelningText` borttagen; meta-raden visar bara datum.
  Hint-texten ändrad från "tryck för att redigera" → "tryck för detaljer".
- Edit-modalen döpt till "Detaljer" (rubrik).
- Ny fördelningslista överst i modalen: en rad per person (namn + belopp),
  med `betalade`-tagg bredvid betalaren. Nollandelar visas nedtonade.
- Beskrivning är nu editerbart textfält (`edit-beskrivning`).
- Datum är editerbart datum-chip med egen state (`valtEditDatum`,
  `andraEditDatum`, `uppdateraEditDatumChip`) — parallellt med add-kontexten.
  Parsar befintligt `datum`-fält via `parsaDatum`.
- `oppnaEdit` → `oppnaDetaljer`. `sparaEdit` plockar upp beskrivning och
  datum och skriver tillbaka till `utgifter[idx]`.
- Belopp = 0 (placeholder-utgifter) fortsätter fungera: fördelningslistan
  visar "Inget belopp angivet ännu" och Spara accepterar tomt belopp.

Inga datamodell-ändringar.

---

## Ursprunglig spec

## Varför

Att klicka på en historik-post öppnar idag en "edit"-modal, men man kan bara
redigera belopp, betalare och fördelning. Beskrivning och datum är låsta — vill
man fixa en felstavning eller ett fel datum får man radera och skapa om.

Samtidigt visas fördelningen som textrad på själva historik-kortet
(`Mikael 120 · Anna 80 · Erik 0`). Med två personer är det OK, men när det är
fler blir raden lång, bryts konstigt och gör kortet rörigt. Det mesta av tiden
är det inte heller den info man letar efter när man scrollar historiken —
beskrivning, belopp och betalare räcker.

Omformulera: klicket öppnar en **detaljvy** (inte edit). Där får man se full
info inklusive fördelning, och där kan man redigera *allt* som är editerbart.

## Vad

### Historik-kortet

- Ta bort fördelnings-texten (`fordelningText` i `renderaHistorik`) från kortet.
- "tryck för att redigera"-hinten byts mot "tryck för detaljer" (eller
  motsvarande — landa formuleringen när det byggs).
- Övrigt på kortet oförändrat: beskrivning, datum, belopp, betalare.

### Detalj-modalen (ersätter nuvarande edit-modal)

Samma modal som idag men:

- **Rubrik:** byts från "Redigera" (eller motsvarande) till "Detaljer".
- **Högre modal** — det får plats mer innehåll. Exakt höjd/max-height bestäms
  i implementation, men tänk scroll-bar vid behov på små skärmar.
- **Överst: fördelning.** Presenteras läsbart, inte som hopklämd rad. Förslag:
  en lista med en rad per person (namn + belopp), eventuellt med betalaren
  markerad. Detta är rent *informativt* i v1 — fördelningen redigeras fortsatt
  via split-knappen nedanför, som idag.
- **Beskrivning:** blir ett editerbart textfält (samma som i add-formuläret).
- **Datum:** blir ett editerbart datum-chip (pil-bak / text / pil-fram —
  återanvänd `.datum-chip`-komponenten från add-formuläret, se
  `index.html:298-302`). Behöver en egen instans/state för edit-kontext, på
  samma sätt som split-state redan splittas mellan `add` och `edit`.
- **Belopp, betalare, split-knapp:** som idag.
- **Spara / Radera:** som idag.

### Datamodell

Inga nya fält. `beskrivning` och `datum` finns redan på utgifts-objektet;
de blir bara editerbara i UI:t.

### Kod-noteringar

- `oppnaEdit` (nu `app.js:433`) → byt namn till `oppnaDetaljer` (eller behåll
  funktionsnamnet och bara byta UI-texten — preferens för namnbyte eftersom
  CLAUDE.md säger svenska funktionsnamn och "edit" inte längre är hela
  poängen).
- `sparaEdit` behöver plocka upp nya värden för `beskrivning` och `datum`
  från modal-fälten innan den skriver tillbaka till `utgifter[idx]`.
- Datum-chip-logiken (`andradatum`) behöver en edit-variant, analogt med
  hur split-state redan har `editSplitTyp` etc. (se `app.js:15-21`).
- `renderaHistorik` — ta bort `fordelningText`-delen (`app.js:525` ff).

## Öppna frågor / noteringar

- **Fördelnings-visning i modalen:** enkel lista räcker i v1. Mer visuellt
  (staplar, procent) kan komma senare men ingår inte här.
- **Betalaren i fördelningen:** markera visuellt? T.ex. liten "betalade"-tagg
  bredvid personen som står som `betalare_id`. Valfritt — bestäms vid bygge.
- **Redigerbar fördelning direkt i listan?** Nej, inte i denna feature —
  split-knappen är fortsatt vägen in till fördelnings-edit. Håller scopet
  litet.
- **Datum-chip i två kontexter:** fundera om chippet ska brytas ut till
  återanvändbar komponent eller bara dupliceras. Troligen duplikat räcker
  (vanilla-JS-ethos), men ID-kollisioner måste undvikas.
- **Avgränsning:** ingen historik av ändringar / ångra-funktion. Redigerar
  man skrivs det över.

## När levererad

Lägg till en kort sammanfattning av vad som faktiskt byggdes (kan skilja från
ursprunglig spec) och flytta filen till `docs/features/done/`.
