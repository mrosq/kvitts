# 017 – Gemensam reglering i rum

**Status:** open
**Skapad:** 2026-04-24
**Beror på:** 004c (rum med reglera-knapp per person)

## Varför

I 004c kan varje deltagare arkivera rummet lokalt för sig själv. Det är
enkelt men saknar koordination — ingen vet om de andra faktiskt har
betalat. Den som ska få pengar har inget sätt att bekräfta att betalningen
gått igenom, och den som betalat kan inte se att mottagaren kvitterat.

## Vad

### Grundmodell

Den som **ska få pengar** (kreditorn) är den som bekräftar att en
betalning kommit in — inte den som betalat. Det speglar verkligheten:
betalaren vet om de betalat, men mottagaren är den naturliga parten att
säga "ja, jag har fått det".

- **Kreditor** ser en "Reglerat"-knapp per person som är skyldig dem.
- **Debitor** ser en statusindikator (t.ex. bock eller väntande-ikon) per
  kreditor — ingen knapp. De väntar på att kreditorn bekräftar.
- När **alla** en debitors kreditorer har tryckt "Reglerat" → debitorns vy
  arkiveras automatiskt utan att debitor behöver göra något.
- När **alla** relationer i rummet är kvitterade → rummet arkiveras för
  samtliga.

### Koppling till Minimera överföringar

Reglerings-UI:t utgår från den **optimerade betalningsplanen**
(feature 008, `minimeradeOverforingar`), inte råa parvisa skulder.
Det innebär att en skuld som netto omdirigeras — t.ex. Peter → dig
istället för Peter → Niklas — är det *du* som bekräftar, inte Niklas.
Appen måste vara tydlig med att "Reglerat" gäller den optimerade planen.

### Datamodell (tillägg till 004)

En ny tabell (eller kolumn på `expenses`) behövs för att spara
kvitterings-status per relation:

```
settlements
  id          uuid primary
  room_id     text FK rooms
  fran_id     uuid FK members   — den som betalat
  till_id     uuid FK members   — den som bekräftar (kreditorn)
  belopp      numeric
  kvitterad   boolean default false
  kvitterad_at timestamptz
```

Alternativt: en enkel `room_settlements`-tabell med en rad per
(rum, från, till)-par som markeras när kreditorn trycker.

### UI-skisser

**Kreditorn (du ska få pengar):**
```
Peter betalar dig 633,33 kr   [Reglerat ✓]
```

**Debitorn (Peter ser):**
```
Du betalar Micke 633,33 kr    [Väntar på bekräftelse…]
Du betalar Jeppe 100,00 kr    [✓ Reglerat]
```

**Rummet fullt reglerat:**
```
Alla skulder är reglerade. Rummet arkiveras.
```

## Öppna frågor / noteringar

- **Vad händer om kreditorn aldrig trycker?** Rummet hänger kvar för
  evigt. Behöver antingen en timeout-mekanism eller möjlighet för
  rum-skaparen att tvångsarkivera.
- **Partial reglering:** Vad händer om beloppet som betalades skiljer sig
  från det förväntade (t.ex. avrundning)? Enklast i v1: kreditorn
  bekräftar hela beloppet eller inte alls.
- **Notifikationer:** Det vore värdefullt att få en push/badge när någon
  kvitterat en av dina betalningar. Utanför scope här — se feature 015
  (PWA) som grund för notifikationer.
- **Relation till 004c-reglering:** 017 ersätter den per-person-lokala
  regleringen från 004c för rum som använder gemensam reglering. Kan
  implementeras som en uppgradering av rum-vyn utan att bryta 004c.

## När levererad

**Status: levererad, mergad till `main`.**

Byggt:
- `logic.js`: `matchaPlanMotKvittenser`, `rumFulltReglerat`, `debitorArkiverad`
  och `minRegleringKlar` (rena, DOM-fria). Kvittensen nycklas på
  `(fran→till)`-paret i den optimerade planen (`minimeradeOverforingar`).
  `minRegleringKlar` avgör när en deltagares vy ska arkiveras: alla rader som
  rör personen (som `fran` ELLER `till`) måste vara kvitterade. Det täcker
  ren debitor, ren kreditor och blandad roll korrekt — en ren kreditor
  arkiveras när hen bekräftat alla inkommande betalningar, inte förr.
- `logic.test.js`: nya determinism-/tie-break-tester som låser att planen är
  reproducerbar (grund för att nyckla kvittenser på par), plus scenariotester
  för reglerings-helpers (inkl. `minRegleringKlar`: ren debitor, ren kreditor,
  blandad roll, ej inblandad, stale) och integration plan→reglering. 113
  tester, hela sviten grön.
- `docs/features/017-migration.sql`: `settlements`-tabell med öppen RLS
  (v1, matchar övriga tabeller).
- `supabase.js`: `hamtaKvittenser`, `kvitteraOverforing` (upsert),
  `avKvitteraOverforing` (delete).
- `app.js`: rum-läge i reglera-modalen — kreditorn får "Reglerat"-knapp,
  debitorn ser statusindikator. Kvittenser pollas ihop med utgifter/deltagare.
  Auto-arkivering av vyn via `minRegleringKlar` när alla överföringar som rör
  deltagaren är kvitterade (gäller både debitor och kreditor).
  Kvittens-hämtningen är best-effort så rummet fungerar även före migrering.

Beslut som gäller (från diskussion):
- **Staleness (v1):** kvittens gäller `(fran→till)`-paret; om planens belopp
  ändrats (ny utgift) flaggas paret `stale` och räknas inte som reglerat.
- **Fullt-reglerat:** härlett klient-side, ingen `rooms.arkiverad`-kolumn i v1.

Återstår innan merge:
1. ~~Kör `docs/features/017-migration.sql` i Supabase SQL Editor.~~ Gjort.
2. ~~Dogfooda hela flödet med minst två deltagare (kreditor bekräftar,
   debitor auto-arkiveras, rum fullt reglerat).~~ Gjort — 2 personer (Anna+Bob)
   samt 3 personer (Anna kreditor, Bob+Cecilia debitorer): kreditorn arkiveras
   först när ALLA inkommande betalningar bekräftats (bugfix `minRegleringKlar`).
3. ~~Merge → `main` → Vercel.~~ Gjort.
