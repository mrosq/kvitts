# 004 – Multi-user-läge via delad rum-länk

**Status:** open
**Skapad:** 2026-04-19

## Varför

Feature 002 leder val B ("Vi lägger in utgifter var för sig") till en
"kommer snart"-skärm. 004 fyller den vägen med faktisk funktionalitet.

Mål: stödja en grupp på 4–8 vänner som var och en, från sin egen telefon,
lägger in utgifter i ett gemensamt projekt (typ "Spanien 2026"). Inga konton,
inga lösenord — bara en delad länk man skickar i Signal/iMessage/WhatsApp.

**Designprinciper som styr 004:**

1. **Single-user-läget förblir rent statiskt, offline-fungerande, backend-fritt.**
   Det är ett värdeerbjudande, inte en provisorisk lösning som ska ersättas.
   004 påverkar bara val B-vägen.
2. **Lågt friktionsmotstånd över säkerhet.** "Vem som helst med länken kommer in"
   är acceptabel modell för use-caset (semesterutgifter bland vänner). Ingen
   bankapp.
3. **Polling över realtid.** Förenklar arkitekturen avsevärt; tillräckligt för
   trafiken (max ~50 utgifter/dag i ett rum).

## Vad

### Anslutning till 002-flödet

Val B i 002 leder inte längre till "kommer snart". Istället:

```
Skärm 2 (lägesval) ──── Val B ───→  Skärm 3b: Skapa eller gå med i ett rum?
                                         ├─ Skapa nytt rum  → namnge → få länk
                                         └─ Gå med i rum   → klistra in länk/kod
```

Användare som öppnar appen via en delad länk (`/r/<id>`) hoppar direkt till
"gå med"-flödet utan att först gå genom skärm 1/2 (men de behöver fortfarande
ange sitt namn om de inte har det sparat sedan tidigare).

### Skapa rum

- Användaren har redan sitt namn från skärm 1 (002).
- Ange projektnamn (max ~40 tecken). Exempel: "Spanien 2026", "Festivalen".
- Backend skapar rum med slumpmässigt ID (6–8 alphanumeriska tecken, t.ex.
  `K7M2X9`). Sparar projektnamn + skaparens namn som första deltagare.
- App visar:
  - Den delbara URL:en (`https://kvitts.app/r/K7M2X9`) med en kopiera-knapp
  - Native share-knapp om tillgänglig (Web Share API)
  - "Klar — börja lägg till utgifter" → tas in i rummet

### Gå med i rum

- URL:en `kvitts.app/r/<id>` parsas av appen vid laddning.
- Om rum-ID:et finns i backend → fortsätt; annars visa felmeddelande.
- Om användaren inte har sitt namn sparat lokalt → fråga "Vad heter du?".
- Om de har ett namn → bekräftelse "Du heter X — gå med i 'Spanien 2026'?".
- Joinar som deltagare i rummet.

### I rummet — UI

Återanvänd så mycket som möjligt av befintlig huvud-UI (saldo-kort,
ny-utgift-formulär, historiklista). Tillägg och ändringar:

- **Headern visar projektnamn** istället för "Mikael & X" — t.ex.
  "Spanien 2026 · 5 personer".
- **Deltagar-lista** synlig nånstans (kanske som chip-rad eller meny). Visar
  vem som är med i rummet.
- **Lägg till utgift** — split-toggle utökas:
  - "Delas på alla" (default)
  - "Delas på valda" (checkbox-lista över deltagare)
  - *(Senare: "Anpassade belopp" — ej i v1)*
- **Betalare-dropdown** — listar alla deltagare i rummet (inte bara två).
- **Saldo-vy** — istället för ett enda tal, en lista:
  - "Anna är skyldig dig 240 kr"
  - "Du är skyldig Erik 80 kr"
  - etc.
  - *(Senare: "Settle up"-förslag som minimerar antalet transaktioner — ej
    i v1, visa bara råa skulder per relation)*
- **Spara/ladda fil** — gömd eller borttagen i rum-läget. Persistensen sker
  via backend, fil-export ger föga mening (skulle kunna läggas till senare
  som backup).

### Datamodellen (N personer)

Skild från val A:s 2-personers-modell. Ny struktur, lever bara på backend
(deltagares lokala localStorage håller bara namn + senaste rum-ID:n för
"återgå snabbt"-funktion):

```js
// Rum
{ id, namn, skapad }

// Deltagare i rum
{ rum_id, person_id, namn, joined_at }
// person_id är en UUID som genereras vid join, sparas i deltagarens
// localStorage så de identifieras igen vid senare besök

// Utgift i rum
{
  id, rum_id, beskrivning, belopp, datum,
  betalare_id,                        // person_id för den som la ut
  fordelning: {                       // hur kostnaden delas, summa = belopp
    "<person_id_1>": 25.00,
    "<person_id_2>": 25.00,
    "<person_id_3>": 50.00
  },
  lagd_till_av_id,                    // person_id för den som skrev in
  skapad
}
```

### Saldo-beräkning för N personer

Konceptuellt detsamma som idag, bara generaliserat:
- För varje deltagare: `nettoSaldo = (allt de betalat) - (deras del av allt)`
- Resultat: en map från person → saldo (positivt = personen ska få in pengar,
  negativt = personen är skyldig)
- För visning: per relation, "X är skyldig Y Z kr". v1 kan visa det enklast:
  per användare, en lista över deras egna in/utgående skulder.

`logic.js` bör utökas så att de generaliserade funktionerna kan användas av
båda lägena (val A blir specialfallet N=2). Diskuteras vid implementation.

### Backend — Supabase

**Tabeller** (förslag — finslipas vid implementation):

| Tabell | Kolumner |
|---|---|
| `rooms` | `id` (text, primary), `namn` (text), `skapad` (timestamptz) |
| `members` | `id` (uuid, primary), `room_id` (text, FK), `namn` (text), `joined_at` (timestamptz) |
| `expenses` | `id` (uuid, primary), `room_id` (text, FK), `beskrivning` (text), `belopp` (numeric), `betalare_id` (uuid, FK members), `fordelning` (jsonb), `datum` (date), `lagd_till_av_id` (uuid, FK members), `skapad` (timestamptz) |

**Åtkomst:**
- Frontend pratar direkt med Supabase via deras JS SDK — ingen egen
  backend-kod behövs i v1.
- **Row Level Security (RLS)** lämnas öppen i v1 (anyone-with-room-id kan
  läsa/skriva för det rummet). Detta matchar "vem som helst med länken kommer
  in"-modellen.
- Anonym Supabase-nyckel (`anon` key) hardkodas i klienten — det är dess
  designsyfte.

**Polling:**
- Var 5–10 sekunder i bakgrunden när användaren har rummet öppet.
- Pausa polling när fliken inte är aktiv (`document.hidden`).
- Direkt refresh efter att användaren själv skrivit (för snabb feedback).

### URL-routing

Appen är fortfarande en single-page `index.html`. Routing implementeras
genom att läsa `window.location.pathname`:
- `/` → vanliga flödet (intro/setup eller appen)
- `/r/<id>` → "gå med i rum"-flöde

Vercel behöver konfigureras (via `vercel.json`) så att `/r/*` faller tillbaka
till `index.html` istället för 404.

## Öppna frågor / noteringar

- **Hantering av namnkollisioner:** Två deltagare som båda heter "Anna". v1:
  acceptera och visa båda som "Anna" (lev med det). v2: lägg till efternamn
  eller initial vid kollision.
- **Person-id sparas i localStorage hos klienten:** Ger en konsekvent
  identitet över sessioner på samma enhet. Om någon byter enhet förlorar de
  sin identitet i rummet (ingen mekanism för att flytta över). Acceptabelt
  för v1.
- **Vad händer om någon är offline?** Läser senast cachade tillstånd om vi
  cachar lokalt; kan inte skriva. För v1 enklast: kräv internet i rum-läget,
  visa felmeddelande om backend ej nås.
- **Polling-frekvens:** Börja med 7s, mät, justera. Eventuellt adaptivt
  (snabbare när någon nyss skrivit, långsammare i lugna perioder).
- **Migration från single-user till rum:** "Konvertera min lokala session
  till ett delat rum"? Skulle vara kraftfullt men icke-trivialt
  (datamodellen skiljer sig). Inte i v1, fundera på v2.
- **Vercel auth-skydd:** Backend (Supabase) är åtkomlig från vem som helst
  med rumskoden, vilket är designat. Själva Vercel-appen kan om så önskas
  fortfarande sättas bakom Cloudflare Access — orelaterat till denna feature.

## Avgränsningar i v1

Saker som *inte* ingår i 004 (men kan komma som följdfeatures):

- Edit-rättigheter per person (alla i rummet kan redigera allt)
- "Settle up"-algoritm som minimerar antal transaktioner
- Anpassade belopp per person i en utgift
- Offline-läge i rum (kräv internet)
- Hantering av namnkollisioner (Anna + Anna)
- Ta bort deltagare ur rum
- Radera rum
- Konvertera single-user-session till rum
- Notifikationer när någon lägger till en utgift
