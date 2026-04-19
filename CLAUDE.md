# Kvitts

En enkel webbapp för att dela utgifter mellan två personer under t.ex. en resa.
All data lagras i webbläsarens `localStorage` — ingen backend, inget konto.

## Kör lokalt

```bash
# Öppna appen
# Ingen byggsteg. Öppna index.html direkt i webbläsaren,
# eller starta en lokal server om du vill testa från telefon på samma wifi:
python -m http.server 8000

# Kör tester (använder Node:s inbyggda test runner, inga deps)
npm test
```

Deployad på Vercel — varje push till `main` deployer automatiskt.

## Stack-val (medvetna)

- **Vanilla JS, single-file HTML.** Inget ramverk, inget byggsteg. Introducera inte React/Vue/build tools utan att det diskuterats — hela poängen är att `index.html` ska kunna öppnas som en fil.
- **Svenska i UI, kommentarer och funktionsnamn.** `raknaDel`, `utgifter`, `betalare` osv. Behåll svenska när du lägger till kod.

## Viktigt om kodstrukturen

**`logic.js` är en duplicat av rena funktioner inne i `<script>`-taggen i `index.html`.** Anledningen: index.html:s versioner läser från DOM (`document.getElementById(...)`) och går inte att enhetstesta. `logic.js` är samma matematik fast frikopplad från DOM.

→ **Om du ändrar en av `raknaDel`, `raknaUtSaldo` eller `egnaInfoText` i ena filen, ändra i båda.** Annars ljuger testerna om appens faktiska beteende.

Planerad framtida förbättring: flytta `<script>` till extern `.js`-fil så att app och tester importerar samma kod. Görs när det blir aktuellt, inte förebyggande.

## Datamodell

**localStorage-nycklar** (namnen är legacy — appen hette först "splitwise"):
- `splitwise_person2` — sträng, den andra personens namn (Mikael är alltid person 1)
- `splitwise_utgifter` — JSON-array av utgifts-objekt

**Utgifts-objekt:**
```js
{
  id: 1234567890,        // Date.now()
  beskrivning: "Mat",
  belopp: 250,           // totalsumma i kr
  betalare: "p1" | "p2", // p1 = Mikael, p2 = person2
  delP1: 125,            // Mikaels andel av belopp
  delP2: 125,            // person2:s andel av belopp
  datum: "2026-04-18"    // toLocaleDateString("sv-SE")
}
```

**Saldo-konvention:** positivt saldo = person2 är skyldig Mikael. Negativt = tvärtom.

## Workflow & specs

Solo-utveckling, ingen GitHub Issues/Projects. Allt som textfiler i repot.

- **`docs/TODO.md`** — index + små ettradare-saker
- **`docs/features/NNN-slug.md`** — specs för riktiga features (numrerade löpande)
- **`docs/features/_template.md`** — mall för nya specs
- **`docs/features/done/`** — arkiverade specs när de är levererade (behåll historiken)

När användaren säger "implementera 003" eller liknande → leta i `docs/features/` efter filen med det numret och följ den som kravspec.

## Deploy

Vercel är kopplat till `main`-branchen i GitHub-repot `mrosq/kvitts`. Ingen manuell deploy-kommando. Live-URL:en delas inte publikt (security-through-obscurity — OK eftersom data är per-användare i localStorage).
