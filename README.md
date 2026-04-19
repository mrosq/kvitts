# Kvitts

Liten webbapp för att hålla reda på utgifter mellan två personer — t.ex. under
en resa eller delad lägenhet. Lägg till utgifter, välj vem som betalade och hur
det ska delas (50/50 eller med "egna kostnader" först), så räknar appen ut
saldot löpande.

Ingen backend, inget konto. All data sparas lokalt i webbläsaren via
`localStorage`. Spara/ladda-funktionen ger en JSON-fil för backup eller för att
flytta data mellan enheter.

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
