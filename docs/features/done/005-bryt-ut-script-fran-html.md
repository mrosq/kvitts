# 005 – Bryt ut JavaScript från index.html

**Status:** open
**Skapad:** 2026-04-19

## Varför

`logic.js` är idag en **kopia** av tre rena beräkningsfunktioner som också
finns inne i `<script>`-taggen i `index.html` (med skillnaden att HTML-
versionerna läser från DOM). Konstruktionen kräver manuell synkronisering
vid varje ändring — kommentaren i `logic.js` säger explicit:
*"Any fix here must be synced back."*

Det är en känd skörhet. Risken är att:

- Logiken i ena filen ändras, den andra glöms → tester ljuger om appens
  faktiska beteende.
- Varje framtida feature som rör matematiken (särskilt 004 där `logic.js`
  ska generaliseras till N personer) gör problemet värre.

Bättre att städa innan 004, så vi har **en** källa till sanning att utöka.

## Vad

Bryt ut all JS från `<script>`-blocket i `index.html` till externa `.js`-
filer, och låt huvudappen importera de delade rena funktionerna från
`logic.js` istället för att duplicera dem.

### Filstruktur efter refaktoreringen

```
index.html      — bara markup + en eller flera <script src="..."> taggar
logic.js        — rena beräkningsfunktioner (oförändrad signatur)
app.js          — DOM-glue, event handlers, state, render-funktioner
```

Eventuellt även en `format.js` för datum/valuta/text-formattering om `app.js`
blir för stor — bestäms vid implementation.

### Modul-strategi

**Plain `<script src="...">`-taggar med globala funktioner.** Inga ES modules.

Anledning: ES modules (`<script type="module">`) blockeras av browsers vid
`file://`-URL:er. Att kunna öppna `index.html` direkt som en lokal fil är ett
uttalat värdeerbjudande för Kvitts (single-user-läget ska kunna köras helt
offline utan server). ES modules skulle bryta det.

Konkret: ladda i ordning i `<head>` eller före `</body>`:
```html
<script src="logic.js"></script>
<script src="app.js"></script>
```

`logic.js` slutar exportera via `module.exports` och börjar exponera
funktioner globalt (eller via en `Logic`-namespace). `logic.test.js` får
fortsätta använda `require("./logic")` — Node-versionen kan kollas in via en
liten conditional export i botten av filen:

```js
if (typeof module !== "undefined") module.exports = { raknaDel, raknaUtSaldo, egnaInfoText };
```

Det är ful men pragmatiskt — funkar för både browser och Node utan
byggsteg.

### Hantera DOM-versionerna

Två funktioner i `index.html` är "DOM-versioner" av rena funktioner:

| HTML-version | Pure version |
|---|---|
| `raknaDel(bel, typ, idP1, idP2)` (läser från DOM) | `logic.raknaDel(belopp, typ, egnaP1, egnaP2)` |
| `egnaInfoText(...)` (samma signatur men tidigare duplicerat i båda filerna) | `logic.egnaInfoText(...)` |

Efter refaktoreringen ska HTML-versionen försvinna helt — `app.js` läser
DOM-värden själv och anropar den rena funktionen direkt:

```js
// I app.js:
function laggTillUtgift() {
  const bel = parseFloat(document.getElementById("belopp").value);
  const egnaP1 = parseFloat(document.getElementById("split-p1").value) || 0;
  const egnaP2 = parseFloat(document.getElementById("split-p2").value) || 0;
  const result = raknaDel(bel, splitTyp, egnaP1, egnaP2);  // pure version
  // ...
}
```

`raknaUtSaldo` har redan en pure signatur (tar `utgifter`-array, returnerar
tal) — inget DOM-pillande där, bara dubbla deklarationer som ska bort.

### Verifiering

- `npm test` → fortfarande 37/37 passerar utan ändringar i `logic.test.js`.
- Manuell rökttest: lägga till utgift, redigera, reglera, spara/ladda fil
  fungerar identiskt i browsern.
- Öppna `index.html` direkt via `file://` på telefonen → verifiera att inget
  bröts av script-tag-ordningen.

## Öppna frågor / noteringar

- **Kommentaren i `logic.js`** ("Any fix here must be synced back") tas bort
  i samma commit — den blir osann efter refaktoreringen.
- **CLAUDE.md** uppdateras: avsnittet om `logic.js`-duplikering tas bort,
  ersätts kort med var pure-funktioner finns vs DOM-glue.
- **`raknaUtSaldo` i HTML** anropar idag som metod utan argument
  (`raknaUtSaldo()` läser global `utgifter`). I refaktoreringen: explicit
  argument (`raknaUtSaldo(utgifter)`). Liten ändring i 3–4 anropsplatser.
- **Ordning relativt 004:** Inte hård dependency, men starkt rekommenderat
  före. Att generalisera N-personers-logik är *mycket* lättare när
  funktionerna finns på ett ställe.
- **`format.js` som egen fil:** Skippas i v1 om `app.js` inte blir
  ohanterligt stor. Lättare att splittra senare än att bygga små filer i
  förskott.

## Avgränsningar

- **Inget byggsteg.** Inget npm-paket, ingen bundler, ingen TypeScript.
- **Inget ramverk.** Vanilla JS fortsätter.
- **Ingen funktionsändring.** Beteendet före och efter ska vara identiskt
  för slutanvändaren. Ren refaktorering.
- **Generaliseringen av `logic.js` till N personer** är 004:s jobb, inte
  005:s. 005 levererar samma funktioner, samma signatur — bara inte
  duplicerade.
