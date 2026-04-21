# 007 – Komplexa fördelningar

**Status:** done
**Skapad:** 2026-04-19
**Levererad:** 2026-04-21

## Varför

När val A utökas till N personer (se 006) blir det fler fall där
default-splitten "jämnt på alla" inte passar:

- **Delmängd:** "Bara 5 av 6 var med på middagen." Resten ska inte belastas.
- **Asymmetriska andelar:** "Anna 20 %, Erik 40 %, Mikael 40 %."

## Vad vi byggde

En split-knapp som alltid visar aktuellt läge (ersätter gamla "50/50" / "Egna
kostnader"-knappar). Klick öppnar en modal med ett tvåstegsflöde:

### Steg 1 – Vem var med?
Personkort med initialer, alla förvalda. Tryck för att avmarkera. "Spara"
sparar direkt som "delas lika av valda" (eller "delas lika av alla" om alla
är valda).

### Steg 2 – Egna belopp (valfritt)
Knapp "Egna belopp →" i steg 1 öppnar textfält för varje vald person.
Logiken är som gamla "egna kostnader": angett belopp är personens egna del,
resten fördelas lika bland valda. Validering: Σ egna > totalt → felmeddelande,
spara blockeras.

## Split-lägen

| splitTyp   | Knapptext                                  | Lagring                          |
|------------|--------------------------------------------|----------------------------------|
| `"jamnt"`  | Delas lika av alla                         | –                                |
| `"delmangd"` | "Delas: Anna & Erik" / "Delas av N st"  | `inkluderade: [...]`             |
| `"egna"`   | Egna belopp                                | `inkluderade`, `egnaBelopp: {…}` |

## Datamodell (tillägg till utgifts-objekt)

```js
{
  // ...befintliga fält...
  splitTyp: "jamnt" | "delmangd" | "egna",  // ny, optional
  inkluderade: ["p1", "p3"],                 // ny, optional – vilka är med
  egnaBelopp: { p1: 100, p3: 0 },           // ny, optional – egna input-värden
}
```

Gamla utgifter utan `splitTyp` hanteras med bakåtkompatibel inferens i edit.

## UI-detaljer

- Knappen i formuläret ändrar text (och får tjockare border) när icke-default läge är valt.
- Edit-modal återställer split-läge korrekt (inkl. egna belopp) från sparade fält.
- Minst en person måste alltid vara markerad.
- Historiklistan visar fördelningen oförändrat (namn: belopp per person).

## Öppna frågor / framtida

- **Summera unika belopp utan vidare delning** (varje person betalar exakt sitt
  angivna belopp, ingen ytterligare fördelning) — sparad till senare.
- **Relaterar till 004:** Designen ska kunna porteras till rum-läget.
