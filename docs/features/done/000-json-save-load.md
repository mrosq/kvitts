# 000 – JSON save/load

**Status:** done
**Skapad:** 2026-04-18
**Levererad:** 2026-04-18 (commit `9143d11`)

## Varför

Appen utvecklades först på telefonen (lös `index.html`-fil i Downloads) och
finns nu också deployad på Vercel. Datan ligger i `localStorage` per origin —
telefonens lokala fil och Vercel-versionen ser inte varandras data. Det fanns
behov av att flytta verklig semesterdata från telefonen till Vercel-instansen.

CSV-export fanns redan men hade designats som en manuell backup för Excel, inte
för round-trip mellan enheter — den saknade `person2`-namnet i strukturerad
form, mappade `betalare` till namn istället för p1/p2-koder, och var skör att
parsa tillbaka.

## Vad

- Tagit bort CSV-export helt (`exportera()` + `.btn-export` med id `export-btn`).
- Lagt till `sparaFil()` som laddar ner en JSON-fil med versionerat schema:
  ```json
  { "version": 1, "exporterad": "<ISO>", "person2": "...", "utgifter": [...] }
  ```
- Lagt till `laddaFil(event)` som läser uppladdad JSON, validerar fältens typer,
  bekräftar med användaren om befintlig data skrivs över, och uppdaterar både
  `localStorage` och UI.
- Två knappar i huvudappen: ⬆ Ladda fil (alltid synlig) + ⬇ Spara fil
  (synlig bara när det finns utgifter).
- Länk på setup-skärmen ("eller ladda en sparad fil") så att en helt ny enhet
  kan importera utan att först fylla i ett platshållarnamn.

## Öppna frågor / noteringar

- JSON-formatet är `version: 1` — framtida format-ändringar (t.ex. för
  multi-session i feature 001) bör läsa fältet och migrera vid behov.
- Nuvarande `laddaFil` ersätter hela state. När multi-session implementeras
  bör import istället kunna skapa en *ny* session istället för att skriva över.
