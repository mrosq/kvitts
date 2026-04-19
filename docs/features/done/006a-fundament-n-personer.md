# 006a – Fundament för N personer

**Status:** levererad 2026-04-19
**Skapad:** 2026-04-19
**Del av:** 006 (multi-person i lokalt läge), första steget.

## Varför

Introducera N-personers-datamodellen och generalisera `logic.js` **utan att
UI:t ändras**. Bryter ut risky delar (migration + logikomskrivning) till en
egen leverans som kan mergeas isolerat. När 006a är levererat ser appen
identisk ut för användaren — allt värde kommer från 006b (UI för fler
personer) och 006c (saldo-omdesign), som båda bygger på detta fundament.

## Vad

### Datamodell

**Nya localStorage-nycklar:**

- `kvitts_personer` — JSON-array:
  ```js
  [
    { id: "p1", namn: "Mikael" },
    { id: "p2", namn: "Anna" }
  ]
  ```
- `kvitts_person_mig` — sträng med id för "jag" (alltid `"p1"` i v1, men
  läggs in från början för symmetri och för att underlätta 004).

ID:n är löpande `p1..p8`. Räcker för lokal modell; 004 byter till UUID:n
senare.

**Gamla nycklar (`kvitts_person1`, `kvitts_person2`)** läses *bara* vid
engångsmigration, raderas efter. Skrivs aldrig av ny kod.

**Utgifts-objekt — nytt format:**

```js
{
  id, beskrivning, belopp, datum,
  betalare_id: "p1",           // tidigare: betalare: "p1"|"p2"
  fordelning: {                // tidigare: delP1, delP2
    "p1": 125,
    "p2": 125
  }
}
```

Invariant: `Σ fordelning[id] = belopp` (0.001-tolerans).

### Engångsmigration

Körs vid appstart. Idempotent.

1. Om `kvitts_personer` saknas: bygg från `kvitts_person1`/`kvitts_person2`
   (default `"Mikael"` om person1 också saknas — samma fallback som 002).
   Sätt `kvitts_person_mig = "p1"`.
2. Walka `kvitts_utgifter`; för varje objekt med `delP1`/`delP2` → konvertera
   till `betalare_id` + `fordelning`. Skriv tillbaka.
3. Radera `kvitts_person1`, `kvitts_person2`.

### `logic.js` — generalisering

Ersätter de nuvarande funktionerna. Signaturer:

- **`raknaDel(belopp, typ, deltagare, egna = {})`** → `{id: andel}`-map eller `null`
  - `typ: "jamnt"` — dela lika mellan alla id:n i `deltagare`.
  - `typ: "egna"` — `egna` är `{id: belopp}`; `(belopp - Σ egna)` delas lika
    mellan `deltagare`. Returnerar `null` om `Σ egna > belopp` (samma
    kontrakt som idag).
  - Behåll `typ: "50"` som alias för `"jamnt"` om det minskar friktion i
    app.js — eller migrera alla anropsplatser direkt. Avgörs vid
    implementation.
- **`raknaUtSaldo(utgifter, personer)`** → `{id: nettoSaldo}`-map
  - För varje utgift: `+belopp` på betalarens id; `-andel` på varje id i
    `fordelning`. Netto > 0 = personen ska få in pengar, < 0 = är skyldig.
- **`raknaParSaldon(utgifter, migId)`** → lista `[{ id, namn?, netto }]`
  - För varje annan person `X`: summera över alla utgifter
    `(mig betalat för X:s andel) − (X betalat för mig:s andel)`.
  - Används av 006c:s detalj-popup. Läggs till redan nu så testerna täcker
    det.
- **`egnaInfoText(...)`** generaliseras på motsvarande sätt.

Rena funktioner, ingen DOM-access. `logic.test.js` skrivs om mot nya
signaturer.

### `app.js` — minimal anpassning

Enda målet: **samma beteende för slutanvändaren.**

- Läs personer via ny struktur, men fortsätt anta N=2 i all rendering.
- `visaApp()`-mappingen `p1-option`/`p2-option` läser från
  `kvitts_personer[0]`/`[1]`.
- Ny-utgift och edit: konvertera mellan gammalt UI-state (`p1`/`p2`,
  `delP1`/`delP2`) och nya datamodellen vid spara/läs. Behåll `typ: "50"`-
  dropdown som idag.
- Saldo-rendering: kalla nya `raknaUtSaldo(...)`, extrahera
  `saldo.p1 − saldo.p2`/2 eller liknande — **exakt samma tal som idag**.

Poängen är att ingen användare ska märka något. Om de gör det är det en bugg.

### JSON-export (spara/ladda)

Format-version bumpas:

```js
{ version: 2, exporterad, personer, utgifter }
```

- Skriv alltid v2 efter 006a.
- Läs v1 och migrera in-memory på import (samma väg som localStorage-
  migrationen).

### Testkrav

- Alla befintliga 2-personers-tester i `logic.test.js` fortsätter passera
  (omskrivna mot nya signaturer, samma siffror ut).
- Nya tester för `raknaUtSaldo` och `raknaParSaldon` med N=3 (trots att
  appen själv ännu inte använder det) — fundament-verifikation.
- Migration-test: JSON-fixture av gammal format in, förväntat nytt format ut.

## Öppna frågor / noteringar

- **`typ: "50"` vs `"jamnt"`:** Byt namn eller alias? Om alias: håll kvar
  i exakt ett release-steg och rensa i 006b. Avgörs vid implementation.
- **Idempotens:** Om migrationen körs på redan-migrerad data ska den
  returnera direkt utan att skriva. Check: `kvitts_personer` finns *och*
  alla utgifter har `fordelning` → skip.
- **Beroende nedåt:** Inga. Kan levereras självständigt.
- **Beroende uppåt:** 006b och 006c bygger båda på detta.

### Avgränsningar i 006a

- **Ingen** UI-förändring.
- Ingen möjlighet att lägga till >2 personer (stöds inte av UI:t ännu).
- Ingen saldo-omdesign.

## När levererad

Levererat enligt spec. Noteringar om faktiska val:

- `raknaDel` accepterar både `"jamnt"` och `"50"` som alias — app.js använder
  `"jamnt"` internt men DOM-id:n (`toggle-50`) lämnades orörda så UI-CSS inte
  bröts. Båda strängarna mappar till samma kodväg.
- `migreraUtgift` lades i `logic.js` (inte app.js) så migrationen blev
  enhetstestbar. Täcks av `migreraUtgift`-beskrivningen i `logic.test.js`.
- `raknaUtSaldo` returnerar en `{id: netto}`-map med en post per person i
  `personer`-arrayen (även om deras netto är 0). app.js extraherar
  `saldo[migId]` för det befintliga saldokortet — samma siffra som innan
  för N=2.
- `raknaParSaldon` lades till redan nu trots att UI:t ännu inte använder
  det. Testerna täcker logiken; 006c kommer konsumera det.
- JSON-laddning kontrollerar primärt `Array.isArray(data.personer)`
  (inte `version === 2`) — mer förlåtande mot framtida format-bumpar och
  defensivt mot edge cases där `version`-fältet skulle saknas.
- `kvitts_person1` behålls som intro-draft-nyckel under setup-flödet
  (skärm 1 → 2 → 3a); raderas när `kvitts_personer` skrivs i `sparaSetup`.
  Samma UX som 002 gav, bara med rätt upprensning.
- 53 tester passerar (N=2 bakåtkompatibla + N=3 + migration).

Smoke-testat i webbläsare: befintlig session migreras transparent, ny
session fungerar via intro-flödet, JSON save/load fungerar för både
v1-filer (migreras vid import) och v2-filer.
