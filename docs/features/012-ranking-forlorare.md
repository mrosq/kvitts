# 012 – Ranking & roliga etiketter i saldovyn

**Status:** open
**Skapad:** 2026-04-19

## Varför

Saldot är just nu funktionellt — vem är skyldig vem, hur mycket. Men när ett
kompisgäng tittar på saldot efter en resa är det inte bara *"vad ska jag
swisha"*, det är också *"vem har snålat"* och *"vem har dragit hela gruppen"*.
Det finns en social komponent som appen kan förstärka med lite humor utan att
förvanska siffrorna.

"Den som gjort minst utlägg" = dagens/resans förlorare. "Den som lagt ut mest"
= kvällens kung. Små etiketter som blir en del av gängets språk.

## Vad

I **saldovyn** (eller i detaljpopupen från [006c](006c-saldo-omdesign.md))
visas utöver siffrorna en liten **ranking-sektion** med roliga etiketter.

**Etiketter att räkna ut (förslag, välj de som känns bäst):**

- 👑 **Kvällens/resans kung** — högst totalt utlägg.
- 🐌 **Snålvargen** — minst totalt utlägg.
- 🍺 **Partyräven** — flest utgifter med fest-ikoner (💃🍺🌙) — kräver [010](010-fun-mode-ikoner.md).
- 🚕 **Taxi-generalen** — har betalat flest transport-utlägg.
- 💸 **Mest i skuld** — den som är skyldig mest netto.

Varje etikett visar namnet på personen + siffran som motiverar den.

**Logik:**
- Räknas ut från samma data som saldot (`utgifter` + `personer`).
- Ren funktion i `logic.js` (t.ex. `raknaUtRanking(utgifter, personer)`) —
  returnerar en array av `{ etikett, personId, varde }`.
- Testbar utan DOM.

**Placering:**
- I saldo-detaljpopupen som en egen sektion under de numeriska raderna.
- Eventuellt en förkortad version direkt på saldo-kortet ("👑 Kalle").

**Ton:**
- Etiketterna ska vara *skämtsamma*, inte elaka. "Snålvargen" är skoj, "fattiglapp"
  är inte.
- Skippa etiketter när datan är för tunn (t.ex. bara 1–2 utgifter totalt,
  eller oavgjort). Bättre att dölja än att visa trivialt.

## Öppna frågor / noteringar

- **Per dag eller totalt?** Börja med totalt. Per-dag-ranking passar bättre
  ihop med [011](011-story-stripe.md) och kan adderas där.
- **Kategori-baserade etiketter:** kräver ikon-data från [010](010-fun-mode-ikoner.md).
  De etiketterna kan läggas in senare när 010 finns; de numeriska (kung,
  snålvarg) funkar oavsett.
- **Fun mode av/på:** känns kul även utan fun mode men är mest i linje med tonen
  när den är på. Tänkbart att bara visa ranking när fun mode är på. Bestäms
  vid implementation.
- **Avgränsning:** ingen historik på ranking ("förra resans kung"), ingen
  notifiering, inga achievements. Bara nuläget från aktuell data.

## När levererad

Lägg till en kort sammanfattning av vad som faktiskt byggdes (kan skilja från
ursprunglig spec) och flytta filen till `docs/features/done/`.
