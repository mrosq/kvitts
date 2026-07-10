# 029 – Install-affordance (installera PWA från appen)

**Status:** open
**Skapad:** 2026-07-10

## Varför

PWA:n (015) är installerbar, men användaren måste själv hitta "Lägg till på
hemskärm" i webbläsarens meny — svårupptäckt, särskilt på iOS. Vi vill göra
installation upptäckbar direkt i appen, utan att tjata.

## Vad

Två saker, i linje med appens avskalade stil (ingen påträngande nag):

### 1. Engångs-toast vid första besöket

- Visa en diskret toast första gången appen öppnas i webbläsarläge (inte redan
  installerad): typ "📲 Lägg Kvitts på hemskärmen — snabbare åtkomst, funkar
  offline" med en **Installera**-knapp och ett kryss för att stänga.
- Visas **en gång** (flagga i localStorage, t.ex. `kvitts_install_toast_visad`).
  Stänger man den kommer den inte tillbaka.
- Auto-döljs efter några sekunder om man inte interagerar (mjuk fade).

### 2. Permanent länk i Inställnings-menyn

- Rad i `meny-modal` ("Inställningar"): **"📲 Installera app"**.
- Alltid tillgänglig när installation är möjlig — den som missade toasten
  hittar den här.

### Plattformslogik

- **Android / desktop Chrome & Edge:** fånga `beforeinstallprompt`, kör
  `event.preventDefault()` och spara eventet. Toast- och menyknappen anropar
  `deferredPrompt.prompt()` och läser `userChoice`.
- **iOS Safari:** inget `beforeinstallprompt` finns. Där visar knappen/toasten
  istället en kort **manuell instruktion** ("Tryck på dela-ikonen och välj
  'Lägg till på hemskärmen'"), gärna med dela-ikonen ritad.
- **Redan installerad:** dölj all install-UI. Detektera via
  `window.matchMedia('(display-mode: standalone)').matches` eller
  `navigator.standalone` (iOS), och lyssna på `appinstalled` för att dölja
  direkt efter installation.

## Öppna frågor / noteringar

- **Toast-komponent finns inte ännu** — appen har modaler men ingen generell
  toast. Bygg en enkel, återanvändbar toast (fixed position, botten, fade
  in/ut). Håll den minimal; ingen kö behövs (bara en åt gången).
- **iOS-detektion:** `/iphone|ipad|ipod/i` mot userAgent + kontroll att det
  inte redan är standalone. Grovt men räcker.
- **Placering av toast:** botten över eventuell innehållslista, respektera
  `max-width: 480px`-layouten. Får inte skymma "+ Lägg till"-knappen
  permanent — därför auto-döljning.
- **Avgränsning:** ingen A/B-logik, ingen "påminn senare"-timer, ingen
  spårning av hur många som installerar. En toast, en menyrad, klart.
- **Beroende:** bygger på 015 (manifest + service worker måste finnas för att
  `beforeinstallprompt` ska triggas).

## När levererad

**Status:** klar (2026-07-10)

Byggt enligt spec:

- **Engångs-toast** (`#install-toast`, mörk pill nederst) som visas en gång
  när appen är synlig och installation är möjlig. Flaggan
  `kvitts_install_toast_visad` i localStorage sätts när den visas → kommer
  aldrig igen. Auto-döljs efter 8 s, och har **Installera**-knapp + kryss.
- **Permanent menyrad** "📲 Installera app" (`#meny-installera-btn`) i
  Inställningar, visas bara när `installMojlig()` är sann.
- **Plattformslogik i `app.js`:** fångar `beforeinstallprompt` (Android/
  desktop) och sparar eventet; `installeraApp()` kör `prompt()`. På iOS
  (ingen prompt) öppnas istället en instruktionsmodal (`#install-ios-modal`)
  med dela-ikon och steg. `appArInstallerad()` (display-mode standalone /
  `navigator.standalone`) och `appinstalled`-eventet döljer all install-UI.
- **CSS** för toast (fade/slide) och iOS-stegen tillagt i `index.html`.
- `sw.js` cache bumpad `kvitts-v1` → `kvitts-v2` (index.html + app.js ändrade).

Verifierat lokalt: simulerat `beforeinstallprompt` → menyrad + toast dyker
upp, `prompt()` anropas, flaggan sätts, install-UI döljs efter installation.
iOS-modalen renderas korrekt. Alla tester gröna.

Avgränsat (ej med): "påminn senare", spårning, A/B — enligt spec.
