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

## Kodstruktur

- **`logic.js`** — rena beräkningsfunktioner (`raknaDel`, `raknaUtSaldo`, `egnaInfoText`). Exponeras globalt i browsern; `logic.test.js` importerar via `require`. Ingen DOM-access.
- **`app.js`** — DOM-glue, event handlers, state, render-funktioner. Anropar `logic.js`-funktionerna direkt.
- **`index.html`** — enbart markup + `<script src="logic.js">` + `<script src="app.js">`.

## Datamodell

**localStorage-nycklar:**
- `kvitts_person1` — sträng, den inloggade personens namn
- `kvitts_person2` — sträng, den andra personens namn
- `kvitts_utgifter` — JSON-array av utgifts-objekt

**Utgifts-objekt:**
```js
{
  id: 1234567890,        // Date.now()
  beskrivning: "Mat",
  belopp: 250,           // totalsumma i kr
  betalare: "p1" | "p2", // p1 = person1, p2 = person2
  delP1: 125,            // person1:s andel av belopp
  delP2: 125,            // person2:s andel av belopp
  datum: "2026-04-18"    // toLocaleDateString("sv-SE")
}
```

**Saldo-konvention:** positivt saldo = person2 är skyldig person1. Negativt = tvärtom.

## Workflow & specs

Solo-utveckling, ingen GitHub Issues/Projects. Allt som textfiler i repot.

- **`docs/TODO.md`** — index + små ettradare-saker
- **`docs/features/NNN-slug.md`** — specs för riktiga features (numrerade löpande)
- **`docs/features/_template.md`** — mall för nya specs
- **`docs/features/done/`** — arkiverade specs när de är levererade (behåll historiken)

När användaren säger "implementera 003" eller liknande → leta i `docs/features/` efter filen med det numret och följ den som kravspec.

## Deploy

Vercel är kopplat till `main`-branchen i GitHub-repot `mrosq/kvitts`. Ingen manuell deploy-kommando. Live-URL:en delas inte publikt (security-through-obscurity — OK eftersom data är per-användare i localStorage).
