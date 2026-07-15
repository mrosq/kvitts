# Kvitts

Liten webbapp för att hålla reda på utgifter i en grupp — t.ex. under en resa
eller i en delad lägenhet. Lägg till utgifter, välj vem som betalade och hur det
ska delas, så räknar appen ut vem som är skyldig vem.

## Två lägen

**Jag håller reda på allas utgifter** — helt lokalt, ingen backend, inget konto.
Du lägger in alla utgifter på din enhet. Data sparas i webbläsarens `localStorage`.
Spara/ladda-knappen ger en JSON-fil för backup eller för att flytta data mellan enheter.

**Vi lägger in utgifter var för sig** — databasdrivet via Supabase.
Varje person lägger in sina egna utgifter på sin telefon. Du skapar en grupp och
delar länken; de andra går med via länken. Ändringar synkas i realtid.

## Kör lokalt

```bash
# Direkt i webbläsaren
open index.html       # macOS
start index.html      # Windows
xdg-open index.html   # Linux

# Eller starta en lokal server (om du vill testa från telefon på samma wifi)
python -m http.server 8000
```

## Tester

```bash
npm test
```

Tester kör mot de rena beräkningsfunktionerna i `logic.js` med Node:s inbyggda
test runner — inga npm-dependencies krävs.

## Stack

Vanilla JavaScript, en enda HTML-fil. Inget byggsteg, inget ramverk.

## Struktur

```
kvitts/
├── index.html              Hela appen
├── logic.js                Rena beräkningsfunktioner (för testning)
├── logic.test.js           Tester
├── CLAUDE.md               Kontext för AI-assisterad utveckling
└── docs/
    ├── TODO.md             Aktiva uppgifter och länkar till features
    └── features/           En fil per större feature/spec
        ├── _template.md
        └── done/           Arkiv över levererade features
```

Se [CLAUDE.md](CLAUDE.md) för mer detaljer kring arkitektur och konventioner.
